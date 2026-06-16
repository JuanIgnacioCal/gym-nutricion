import type { Receta } from '@/types';

/** Fila cruda de la tabla `recetas` (ingredientes guardado como JSON string). */
export interface RecetaRow extends Omit<Receta, 'ingredientes'> {
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
  return { ...row, ingredientes };
}
