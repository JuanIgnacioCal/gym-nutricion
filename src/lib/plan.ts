import type Database from 'better-sqlite3';
import type { Receta, TipoComida } from '@/types';
import { rowToReceta, RecetaRow } from './recetas';

/** Slots del día según el número de comidas elegido. */
export function slotsParaComidas(comidas: number): TipoComida[] {
  return comidas === 4
    ? ['desayuno', 'almuerzo', 'merienda', 'cena']
    : ['desayuno', 'almuerzo', 'cena'];
}

function tagPara(slot: TipoComida): string {
  switch (slot) {
    case 'desayuno':
    case 'merienda':
      return slot;
    case 'almuerzo':
      return 'almuerzo';
    case 'cena':
      return 'cena';
  }
}

function elegirAlAzar<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function candidatasTipo(db: Database.Database, slot: TipoComida, excluir: number[]): RecetaRow[] {
  const filas = db
    .prepare(`SELECT * FROM recetas WHERE tipo_comida LIKE ? ORDER BY id`)
    .all(`%${tagPara(slot)}%`) as RecetaRow[];
  return filas.filter((r) => !excluir.includes(r.id));
}

interface MacrosBase {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

/** Objetivo de macros para una sola comida (ya dividido por la cantidad de comidas del día). */
export interface ObjetivoComida {
  calorias: number;
  proteinas?: number;
  carbohidratos?: number;
  grasas?: number;
}

const RANGO = 0.4;

/**
 * Elige una receta para el slot, al azar entre TODAS las candidatas dentro de
 * ±40% de las calorías por comida. La variedad sale de elegir sobre el pool
 * completo en rango (no sobre "las mejores"); el ajuste fino de macros lo hace
 * después el escalado de porciones (ver escalarPlan).
 */
export function seleccionarReceta(
  db: Database.Database,
  slot: TipoComida,
  objetivoComida: ObjetivoComida,
  excluir: number[] = []
): Receta | null {
  let cands = candidatasTipo(db, slot, excluir);
  if (cands.length === 0) {
    const todas = db.prepare(`SELECT * FROM recetas ORDER BY id`).all() as RecetaRow[];
    cands = todas.filter((r) => !excluir.includes(r.id));
  }
  if (cands.length === 0) return null;

  const min = objetivoComida.calorias * (1 - RANGO);
  const max = objetivoComida.calorias * (1 + RANGO);
  const enRango = cands.filter((r) => r.calorias >= min && r.calorias <= max);
  const pool = enRango.length > 0 ? enRango : cands;
  return rowToReceta(elegirAlAzar(pool));
}

export interface ObjetivoPlan {
  calorias: number;
  comidas: number;
  proteinas?: number;
  carbohidratos?: number;
  grasas?: number;
}

// ───────────────────────── Escalado de porciones ─────────────────────────
// Cada receta se sirve escalada (ej. ×1.3 porción) para que el TOTAL del día se
// acerque lo más posible a las 4 metas (calorías + macros). Pasarse penaliza más
// que quedarse corto, para evitar superar el objetivo. La proteína pesa un poco más.

const ESC_MIN = 0.5;
const ESC_MAX = 1.75;
const ESC_PASO = 0.05;
const PESO = { calorias: 1.5, proteinas: 1.4, carbohidratos: 1.0, grasas: 1.0 };
const PENAL_EXCESO = 2.5;

function perdida(valor: number, objetivo?: number): number {
  if (!objetivo || objetivo <= 0) return 0;
  const rel = (valor - objetivo) / objetivo;
  return rel > 0 ? PENAL_EXCESO * rel * rel : rel * rel;
}

function totalesEscalados(recetas: MacrosBase[], escalas: number[]): MacrosBase {
  return recetas.reduce<MacrosBase>(
    (acc, r, i) => {
      const k = escalas[i];
      acc.calorias += r.calorias * k;
      acc.proteinas += r.proteinas * k;
      acc.carbohidratos += r.carbohidratos * k;
      acc.grasas += r.grasas * k;
      return acc;
    },
    { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
  );
}

function costoEscalas(recetas: MacrosBase[], escalas: number[], obj: ObjetivoPlan): number {
  const t = totalesEscalados(recetas, escalas);
  return (
    PESO.calorias * perdida(t.calorias, obj.calorias) +
    PESO.proteinas * perdida(t.proteinas, obj.proteinas) +
    PESO.carbohidratos * perdida(t.carbohidratos, obj.carbohidratos) +
    PESO.grasas * perdida(t.grasas, obj.grasas)
  );
}

/** Busca el factor de escala por receta que minimiza la distancia al objetivo del día. */
function optimizarEscalas(recetas: MacrosBase[], obj: ObjetivoPlan): number[] {
  const escalas = recetas.map(() => 1);
  const pasos: number[] = [];
  for (let v = ESC_MIN; v <= ESC_MAX + 1e-9; v += ESC_PASO) pasos.push(+v.toFixed(2));
  for (let vuelta = 0; vuelta < 12; vuelta++) {
    for (let i = 0; i < recetas.length; i++) {
      let mejor = escalas[i];
      let mejorCosto = Infinity;
      for (const v of pasos) {
        escalas[i] = v;
        const c = costoEscalas(recetas, escalas, obj);
        if (c < mejorCosto) {
          mejorCosto = c;
          mejor = v;
        }
      }
      escalas[i] = mejor;
    }
  }
  return escalas;
}

/**
 * Devuelve el plan con cada receta escalada a su porción óptima: los macros
 * quedan ya multiplicados por el factor, y `escala` guarda el factor para mostrarlo.
 */
export function escalarPlan(
  plan: Partial<Record<TipoComida, Receta>>,
  objetivo: ObjetivoPlan
): Partial<Record<TipoComida, Receta>> {
  const slots = (Object.keys(plan) as TipoComida[]).filter((s) => plan[s]);
  if (slots.length === 0) return plan;
  const recetas = slots.map((s) => plan[s]!);
  const escalas = optimizarEscalas(recetas, objetivo);
  const salida: Partial<Record<TipoComida, Receta>> = {};
  slots.forEach((s, i) => {
    const r = plan[s]!;
    const k = escalas[i];
    salida[s] = {
      ...r,
      calorias: Math.round(r.calorias * k),
      proteinas: +(r.proteinas * k).toFixed(1),
      carbohidratos: +(r.carbohidratos * k).toFixed(1),
      grasas: +(r.grasas * k).toFixed(1),
      fibra: +(r.fibra * k).toFixed(1),
      escala: +k.toFixed(2),
    };
  });
  return salida;
}

/** Devuelve IDs de recetas usadas en los últimos 14 días para un slot. */
function recetasRecientes(
  db: Database.Database,
  usuario_id: string,
  slot: TipoComida
): Set<number> {
  const col = slot + '_id';
  const filas = db
    .prepare(
      `SELECT ${col} FROM plan_diario WHERE usuario_id = ? AND fecha >= date('now', '-14 days') AND ${col} IS NOT NULL`
    )
    .all(usuario_id) as Record<string, number>[];
  return new Set(filas.map((r) => r[col]));
}

/** Construye una selección de recetas (una por slot), con variedad y sin repetir. */
function construirSeleccion(
  db: Database.Database,
  slots: TipoComida[],
  objetivoComida: ObjetivoComida,
  usuario_id?: string
): Partial<Record<TipoComida, Receta>> {
  const usadosHoy: number[] = [];
  const plan: Partial<Record<TipoComida, Receta>> = {};
  for (const slot of slots) {
    const recientes = usuario_id ? recetasRecientes(db, usuario_id, slot) : new Set<number>();
    const excluir = [...usadosHoy, ...Array.from(recientes)];
    let receta = seleccionarReceta(db, slot, objetivoComida, excluir);
    if (!receta && recientes.size > 0) {
      receta = seleccionarReceta(db, slot, objetivoComida, usadosHoy);
    }
    if (receta) {
      plan[slot] = receta;
      usadosHoy.push(receta.id);
    }
  }
  return plan;
}

/**
 * Genera un plan completo. Prueba varias selecciones variadas, escala cada una a
 * porciones y se queda con la que mejor pega el objetivo del día. Así variedad
 * (selección al azar) y exactitud (escalado) no pelean entre sí.
 * Devuelve las recetas SIN escalar; el escalado se aplica al leer (escalarPlan).
 */
export function generarPlan(
  db: Database.Database,
  objetivo: ObjetivoPlan,
  usuario_id?: string
): Partial<Record<TipoComida, Receta>> {
  const slots = slotsParaComidas(objetivo.comidas);
  const objetivoComida: ObjetivoComida = {
    calorias: objetivo.calorias / objetivo.comidas,
    proteinas: objetivo.proteinas ? objetivo.proteinas / objetivo.comidas : undefined,
    carbohidratos: objetivo.carbohidratos ? objetivo.carbohidratos / objetivo.comidas : undefined,
    grasas: objetivo.grasas ? objetivo.grasas / objetivo.comidas : undefined,
  };

  const INTENTOS = 8;
  let mejorPlan: Partial<Record<TipoComida, Receta>> | null = null;
  let mejorCosto = Infinity;

  for (let intento = 0; intento < INTENTOS; intento++) {
    const plan = construirSeleccion(db, slots, objetivoComida, usuario_id);
    const slotsConReceta = (Object.keys(plan) as TipoComida[]).filter((s) => plan[s]);
    if (slotsConReceta.length === 0) continue;
    const recetas = slotsConReceta.map((s) => plan[s]!);
    const escalas = optimizarEscalas(recetas, objetivo);
    const costo = costoEscalas(recetas, escalas, objetivo);
    if (costo < mejorCosto) {
      mejorCosto = costo;
      mejorPlan = plan;
    }
  }

  return mejorPlan ?? {};
}
