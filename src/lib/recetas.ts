import type { Receta } from '@/types';
import pasosData from '../../data/pasos.json';

/** Mapa id de receta → pasos de preparación (fuente: data/pasos.json). */
const PASOS = (pasosData as { pasos: Record<string, string[]> }).pasos;

/** Fila cruda de la tabla `recetas` (ingredientes guardado como JSON string). */
export interface RecetaRow extends Omit<Receta, 'ingredientes' | 'pasos'> {
  ingredientes: string | null;
}

/** Convierte una fila de la DB en un objeto Receta (parsea ingredientes). */
export function rowToReceta(row: RecetaRow): Receta {
  let ingredientes: string[] = [];
  if (row.ingredientes) {
    try {
      const parsed = JSON.parse(row.ingredientes);
      if (Array.isArray(parsed)) ingredientes = parsed;
    } catch {
      ingredientes = [];
    }
  }
  const pasos = PASOS[String(row.id)];
  return { ...row, ingredientes, ...(pasos ? { pasos } : {}) };
}
