import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { seleccionarReceta } from '@/lib/plan';
import type { TipoComida } from '@/types';

export const dynamic = 'force-dynamic';

const SLOTS: TipoComida[] = ['desayuno', 'almuerzo', 'merienda', 'cena'];

interface PlanRow {
  id: number;
  desayuno_id: number | null;
  almuerzo_id: number | null;
  merienda_id: number | null;
  cena_id: number | null;
}

/**
 * GET /api/plan/cambiar?slot=desayuno&usuario_id=&fecha=&calorias=&comidas=
 * Reemplaza solo ese slot por otra receta y devuelve la nueva.
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const slot = searchParams.get('slot') as TipoComida | null;
  const usuario_id = searchParams.get('usuario_id');
  const fecha = searchParams.get('fecha');
  const calorias = Number(searchParams.get('calorias') ?? 2000);
  const comidas = Number(searchParams.get('comidas') ?? 3);

  if (!slot || !SLOTS.includes(slot) || !usuario_id || !fecha) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }

  const row = db
    .prepare('SELECT * FROM plan_diario WHERE usuario_id = ? AND fecha = ?')
    .get(usuario_id, fecha) as PlanRow | undefined;

  if (!row) {
    return NextResponse.json({ error: 'No hay plan para esa fecha' }, { status: 404 });
  }

  // Excluir las recetas ya presentes en el plan (incluida la actual del slot).
  const usados = [row.desayuno_id, row.almuerzo_id, row.merienda_id, row.cena_id].filter(
    (x): x is number => x != null
  );

  const kcalPorComida = calorias / (comidas || 1);
  const nueva = seleccionarReceta(db, slot, kcalPorComida, usados);

  if (!nueva) {
    return NextResponse.json({ error: 'Sin recetas alternativas disponibles' }, { status: 404 });
  }

  db.prepare(`UPDATE plan_diario SET ${slot}_id = ? WHERE id = ?`).run(nueva.id, row.id);

  return NextResponse.json(nueva);
}
