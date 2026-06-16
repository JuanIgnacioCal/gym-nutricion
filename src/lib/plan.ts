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
// La proteína pesa un poco más al puntuar: es el macro que más le importa al socio del gym
// y el que suele quedar más desbalanceado si solo se mira calorías.
const PESO_PROTEINA = 1.2;

/** Error relativo |valor - objetivo| / objetivo. Si no hay objetivo definido, no penaliza. */
function errorRelativo(valor: number, objetivo?: number): number {
  if (!objetivo || objetivo <= 0) return 0;
  return Math.abs(valor - objetivo) / objetivo;
}

/** Puntaje de desbalance de una receta contra el objetivo de la comida (más bajo = mejor). */
function puntuarReceta(r: MacrosBase, obj: ObjetivoComida): number {
  return (
    errorRelativo(r.calorias, obj.calorias) +
    errorRelativo(r.proteinas, obj.proteinas) * PESO_PROTEINA +
    errorRelativo(r.carbohidratos, obj.carbohidratos) +
    errorRelativo(r.grasas, obj.grasas)
  );
}

/** Las `n` candidatas mejor balanceadas (no solo la más cercana en calorías). */
function topCandidatas(cands: RecetaRow[], obj: ObjetivoComida, n: number): RecetaRow[] {
  return [...cands].sort((a, b) => puntuarReceta(a, obj) - puntuarReceta(b, obj)).slice(0, Math.max(1, n));
}

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

  // Entre las mejores candidatas por balance de macros (no solo calorías), elegimos
  // al azar para mantener variedad sin perder precisión nutricional.
  const mejores = topCandidatas(pool, objetivoComida, Math.min(3, pool.length));
  const elegida = elegirAlAzar(mejores);
  return rowToReceta(elegida);
}

export interface ObjetivoPlan {
  calorias: number;
  comidas: number;
  proteinas?: number;
  carbohidratos?: number;
  grasas?: number;
}

function totalMacros(plan: Partial<Record<TipoComida, Receta>>): MacrosBase {
  return Object.values(plan).reduce<MacrosBase>(
    (acc, r) => {
      if (!r) return acc;
      acc.calorias += r.calorias;
      acc.proteinas += r.proteinas;
      acc.carbohidratos += r.carbohidratos;
      acc.grasas += r.grasas;
      return acc;
    },
    { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
  );
}

/** Desviación total ponderada del plan respecto al objetivo diario completo (calorías + macros). */
function desviacionTotal(totales: MacrosBase, objetivo: ObjetivoPlan): number {
  return (
    errorRelativo(totales.calorias, objetivo.calorias) +
    errorRelativo(totales.proteinas, objetivo.proteinas) * PESO_PROTEINA +
    errorRelativo(totales.carbohidratos, objetivo.carbohidratos) +
    errorRelativo(totales.grasas, objetivo.grasas)
  );
}

/**
 * Ajusta el plan iterativamente para acercarlo al objetivo diario completo
 * (calorías, proteínas, carbohidratos y grasas), no solo calorías.
 * En cada vuelta detecta el slot que peor balanceado está y prueba reemplazarlo
 * por la candidata que más reduzca la desviación total del día.
 */
function ajustarPlan(
  db: Database.Database,
  plan: Partial<Record<TipoComida, Receta>>,
  slots: TipoComida[],
  objetivo: ObjetivoPlan
): void {
  const UMBRAL = 0.15;

  for (let iter = 0; iter < 8; iter++) {
    const totales = totalMacros(plan);
    const desviacion = desviacionTotal(totales, objetivo);
    if (desviacion <= UMBRAL) return;

    const slotsConReceta = slots.filter((s) => plan[s]);
    if (slotsConReceta.length === 0) return;

    const objetivoComidaProm: ObjetivoComida = {
      calorias: objetivo.calorias / slots.length,
      proteinas: objetivo.proteinas ? objetivo.proteinas / slots.length : undefined,
      carbohidratos: objetivo.carbohidratos ? objetivo.carbohidratos / slots.length : undefined,
      grasas: objetivo.grasas ? objetivo.grasas / slots.length : undefined,
    };

    // El slot que peor puntúa contra su porción del objetivo es el candidato a reemplazar.
    const slotObjetivo = slotsConReceta.reduce((peor, s) =>
      puntuarReceta(plan[s]!, objetivoComidaProm) > puntuarReceta(plan[peor]!, objetivoComidaProm)
        ? s
        : peor
    );

    const actual = plan[slotObjetivo]!;
    const usados = slotsConReceta.map((s) => plan[s]!.id);
    const cands = candidatasTipo(db, slotObjetivo, usados);
    if (cands.length === 0) return;

    // Probamos cada candidata real y nos quedamos con la que más reduce la desviación total del día.
    let mejorCand: RecetaRow | null = null;
    let mejorDesviacion = desviacion;
    for (const cand of cands) {
      const totalesProbando: MacrosBase = {
        calorias: totales.calorias - actual.calorias + cand.calorias,
        proteinas: totales.proteinas - actual.proteinas + cand.proteinas,
        carbohidratos: totales.carbohidratos - actual.carbohidratos + cand.carbohidratos,
        grasas: totales.grasas - actual.grasas + cand.grasas,
      };
      const d = desviacionTotal(totalesProbando, objetivo);
      if (d < mejorDesviacion) {
        mejorDesviacion = d;
        mejorCand = cand;
      }
    }

    if (!mejorCand) return; // ninguna candidata mejora el balance: dejamos de iterar
    plan[slotObjetivo] = rowToReceta(mejorCand);
  }
}

/**
 * Devuelve IDs de recetas usadas en los ultimos 14 dias para un slot.
 */
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

/** Genera un plan completo: una receta por slot, sin repetir, ajustado al objetivo (calorías + macros). */
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
  const usadosHoy: number[] = [];
  const plan: Partial<Record<TipoComida, Receta>> = {};

  for (const slot of slots) {
    const recientes = usuario_id ? recetasRecientes(db, usuario_id, slot) : new Set<number>();
    const excluir = [...usadosHoy, ...Array.from(recientes)];

    let receta = seleccionarReceta(db, slot, objetivoComida, excluir);

    // Si todas las candidatas estaban en historial, ignorar historial para ese slot
    if (!receta && recientes.size > 0) {
      receta = seleccionarReceta(db, slot, objetivoComida, usadosHoy);
    }

    if (receta) {
      plan[slot] = receta;
      usadosHoy.push(receta.id);
    }
  }

  ajustarPlan(db, plan, slots, objetivo);
  return plan;
}
