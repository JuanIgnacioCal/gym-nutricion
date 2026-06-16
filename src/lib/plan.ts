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

function masCercana(cands: RecetaRow[], objetivoKcal: number): RecetaRow {
  return cands.reduce((mejor, r) =>
    Math.abs(r.calorias - objetivoKcal) < Math.abs(mejor.calorias - objetivoKcal) ? r : mejor
  );
}

const RANGO = 0.4;

export function seleccionarReceta(
  db: Database.Database,
  slot: TipoComida,
  kcalObjetivo: number,
  excluir: number[] = []
): Receta | null {
  let cands = candidatasTipo(db, slot, excluir);
  if (cands.length === 0) {
    const todas = db.prepare(`SELECT * FROM recetas ORDER BY id`).all() as RecetaRow[];
    cands = todas.filter((r) => !excluir.includes(r.id));
  }
  if (cands.length === 0) return null;
  const min = kcalObjetivo * (1 - RANGO);
  const max = kcalObjetivo * (1 + RANGO);
  const enRango = cands.filter((r) => r.calorias >= min && r.calorias <= max);
  const elegida = enRango.length > 0 ? elegirAlAzar(enRango) : masCercana(cands, kcalObjetivo);
  return rowToReceta(elegida);
}

export interface ObjetivoPlan {
  calorias: number;
  comidas: number;
}

function totalKcal(plan: Partial<Record<TipoComida, Receta>>): number {
  return Object.values(plan).reduce((s, r) => s + (r?.calorias ?? 0), 0);
}

function ajustarPlan(
  db: Database.Database,
  plan: Partial<Record<TipoComida, Receta>>,
  slots: TipoComida[],
  objetivoCal: number
): void {
  for (let iter = 0; iter < 8; iter++) {
    const total = totalKcal(plan);
    const gap = total - objetivoCal;
    if (Math.abs(gap) / objetivoCal <= 0.15) return;
    const sobra = gap > 0;
    const slotsConReceta = slots.filter((s) => plan[s]);
    const slotObjetivo = slotsConReceta.reduce((a, b) =>
      sobra
        ? (plan[b]!.calorias > plan[a]!.calorias ? b : a)
        : (plan[b]!.calorias < plan[a]!.calorias ? b : a)
    );
    const actual = plan[slotObjetivo]!;
    const deseado = actual.calorias - gap;
    const usados = slotsConReceta.map((s) => plan[s]!.id);
    const cands = candidatasTipo(db, slotObjetivo, usados);
    if (cands.length === 0) return;
    const mejor = masCercana(cands, deseado);
    const nuevoTotal = total - actual.calorias + mejor.calorias;
    if (Math.abs(nuevoTotal - objetivoCal) >= Math.abs(gap)) return;
    plan[slotObjetivo] = rowToReceta(mejor);
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

/** Genera un plan completo: una receta por slot, sin repetir, ajustado al objetivo. */
export function generarPlan(
  db: Database.Database,
  objetivo: ObjetivoPlan,
  usuario_id?: string
): Partial<Record<TipoComida, Receta>> {
  const slots = slotsParaComidas(objetivo.comidas);
  const kcalPorComida = objetivo.calorias / objetivo.comidas;
  const usadosHoy: number[] = [];
  const plan: Partial<Record<TipoComida, Receta>> = {};

  for (const slot of slots) {
    const recientes = usuario_id ? recetasRecientes(db, usuario_id, slot) : new Set<number>();
    const excluir = [...usadosHoy, ...Array.from(recientes)];

    let receta = seleccionarReceta(db, slot, kcalPorComida, excluir);

    // Si todas las candidatas estaban en historial, ignorar historial para ese slot
    if (!receta && recientes.size > 0) {
      receta = seleccionarReceta(db, slot, kcalPorComida, usadosHoy);
    }

    if (receta) {
      plan[slot] = receta;
      usadosHoy.push(receta.id);
    }
  }

  ajustarPlan(db, plan, slots, objetivo.calorias);
  return plan;
}
