import type { Receta } from '@/types';
import pasosData from '../../data/pasos.json';
import { escalarIngrediente } from './util';

/** Mapa id de receta → pasos de preparación (fuente: data/pasos.json). */
const PASOS = (pasosData as { pasos: Record<string, string[]> }).pasos;

/** Fila cruda de la tabla `recetas` (ingredientes guardado como JSON string). */
export interface RecetaRow extends Omit<Receta, 'ingredientes' | 'pasos'> {
  ingredientes: string | null;
  /** Pasos propios (recetas del usuario), JSON string. Las predefinidas usan data/pasos.json. */
  pasos: string | null;
}

// ───────────────────── Normalización de porciones ─────────────────────
// Bug detectado 2026-06-21: las recetas con `porciones > 1` guardan la lista de
// ingredientes de la OLLA ENTERA. Además la convención de macros es inconsistente:
// unas los guardan POR PORCIÓN (ej. "12 huevos" con 100 kcal = 1 muffin) y otras
// del TOTAL de la receta. Como un slot del plan = 1 porción, mostrábamos cantidades
// infladas (ej. 480 g de pollo, 12 huevos) contra macros de una sola porción.
//
// Clasificación de las 49 recetas multi-porción por auditoría programática
// (proteína del ingrediente principal vs. macros guardados) + revisión manual:
//   - MACROS_POR_PORCION: ingredientes = olla entera → se dividen por `porciones`.
//   - MACROS_TOTAL: ingredientes Y macros = receta entera → se dividen ambos.
// 3 recetas quedaron SIN clasificar por datos ambiguos (ids 209, 218, 240): se
// dejan intactas a propósito hasta confirmar sus macros reales (no adivinar).
//
// Se hace en lectura (no en el seed) porque la DB de Railway es persistente y el
// seed es INSERT OR IGNORE: así el fix llega a producción solo pusheando el código.
const RECETAS_MACROS_POR_PORCION = new Set([
  201, 202, 205, 206, 207, 208, 210, 216, 227, 228, 229, 232, 235, 236, 237, 238, 241, 242, 243,
]);
const RECETAS_MACROS_TOTAL = new Set([
  9, 50, 59, 60, 64, 74, 82, 86, 88, 97, 105, 109, 110, 113, 116, 122, 131,
  161, 162, 164, 167, 171, 174, 177, 179, 182, 230,
]);

/** Lleva una receta multi-porción confirmada a su equivalente de 1 porción. */
function normalizarAUnaPorcion(r: Receta): Receta {
  const p = r.porciones > 1 ? r.porciones : 1;
  if (p === 1) return r;
  const macrosPorPorcion = RECETAS_MACROS_POR_PORCION.has(r.id);
  const macrosTotal = RECETAS_MACROS_TOTAL.has(r.id);
  if (!macrosPorPorcion && !macrosTotal) return r; // no verificada: no tocar

  // Los ingredientes siempre vienen de la olla entera → llevarlos a 1 porción.
  const ingredientes = r.ingredientes.map((linea) => escalarIngrediente(linea, 1 / p));
  const out: Receta = { ...r, ingredientes, porciones: 1 };

  // Si los macros eran del total de la receta, también se dividen por porción.
  if (macrosTotal) {
    out.calorias = Math.round(r.calorias / p);
    out.proteinas = +(r.proteinas / p).toFixed(1);
    out.carbohidratos = +(r.carbohidratos / p).toFixed(1);
    out.grasas = +(r.grasas / p).toFixed(1);
    out.fibra = +((r.fibra ?? 0) / p).toFixed(1);
  }
  return out;
}

/** Convierte una fila de la DB en un objeto Receta (parsea ingredientes). */
export function rowToReceta(row: RecetaRow): Receta {
  const { ingredientes: ingRaw, pasos: pasosRaw, ...rest } = row;

  let ingredientes: string[] = [];
  if (ingRaw) {
    try {
      const parsed = JSON.parse(ingRaw);
      if (Array.isArray(parsed)) ingredientes = parsed;
    } catch {
      ingredientes = [];
    }
  }

  // Pasos: primero los propios de la receta (columna DB, recetas del usuario);
  // si no hay, los predefinidos de data/pasos.json.
  let pasos: string[] | undefined;
  if (pasosRaw) {
    try {
      const p = JSON.parse(pasosRaw);
      if (Array.isArray(p) && p.length > 0) pasos = p.map(String);
    } catch {
      /* pasos corruptos: se ignoran */
    }
  }
  if (!pasos) pasos = PASOS[String(rest.id)];

  const receta: Receta = { ...rest, ingredientes, ...(pasos ? { pasos } : {}) };
  return normalizarAUnaPorcion(receta);
}
