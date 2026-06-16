import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { rowToReceta, RecetaRow } from '@/lib/recetas';
import { generarPlan } from '@/lib/plan';
import type { Receta, TipoComida } from '@/types';

export const dynamic = 'force-dynamic';

interface PlanRow {
  id: number;
  usuario_id: string;
  fecha: string;
  desayuno_id: number | null;
  almuerzo_id: number | null;
  merienda_id: number | null;
  cena_id: number | null;
}

const SLOTS: TipoComida[] = ['desayuno', 'almuerzo', 'merienda', 'cena'];

function getReceta(db: ReturnType<typeof getDb>, id: number | null): Receta | undefined {
  if (!id) return undefined;
  const row = db.prepare('SELECT * FROM recetas WHERE id = ?').get(id) as RecetaRow | undefined;
  return row ? rowToReceta(row) : undefined;
}

function planRowToJSON(db: ReturnType<typeof getDb>, row: PlanRow | undefined) {
  if (!row) return null;
  return {
    id: row.id,
    usuario_id: row.usuario_id,
    fecha: row.fecha,
    desayuno: getReceta(db, row.desayuno_id),
    almuerzo: getReceta(db, row.almuerzo_id),
    merienda: getReceta(db, row.merienda_id),
    cena: getReceta(db, row.cena_id),
  };
}

/** GET /api/plan?usuario_id=&fecha= → plan del día (o null). */
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const usuario_id = searchParams.get('usuario_id');
  const fecha = searchParams.get('fecha');

  if (!usuario_id || !fecha) {
    return NextResponse.json({ error: 'Faltan usuario_id o fecha' }, { status: 400 });
  }

  const row = db
    .prepare('SELECT * FROM plan_diario WHERE usuario_id = ? AND fecha = ?')
    .get(usuario_id, fecha) as PlanRow | undefined;

  return NextResponse.json(planRowToJSON(db, row));
}

/** POST /api/plan { usuario_id, fecha, objetivo } → genera y guarda un plan nuevo. */
export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { usuario_id, fecha, objetivo } = body ?? {};

  if (!usuario_id || !fecha || !objetivo) {
    return NextResponse.json({ error: 'Faltan datos (usuario_id, fecha, objetivo)' }, { status: 400 });
  }

  const plan = generarPlan(
    db,
    { calorias: Number(objetivo.calorias) || 2000, comidas: Number(objetivo.comidas) || 3 },
    usuario_id,
  );

  const ids: Record<string, number | null> = {};
  for (const slot of SLOTS) ids[slot] = plan[slot]?.id ?? null;

  // Reemplaza el plan existente del día (upsert manual).
  db.prepare('DELETE FROM plan_diario WHERE usuario_id = ? AND fecha = ?').run(usuario_id, fecha);
  const info = db
    .prepare(
      `INSERT INTO plan_diario (usuario_id, fecha, desayuno_id, almuerzo_id, merienda_id, cena_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(usuario_id, fecha, ids.desayuno, ids.almuerzo, ids.merienda, ids.cena);

  const row = db
    .prepare('SELECT * FROM plan_diario WHERE id = ?')
    .get(info.lastInsertRowid) as PlanRow;

  return NextResponse.json(planRowToJSON(db, row));
}

/**
 * PATCH /api/plan { usuario_id, fecha, slot, receta_id }
 * Asigna una receta concreta a un slot (crea el plan del día si no existe).
 */
export async function PATCH(req: NextRequest) {
  const db = getDb();
  const b = await req.json();
  const { usuario_id, fecha, slot, receta_id } = b ?? {};

  if (!usuario_id || !fecha || !slot || !SLOTS.includes(slot)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }

  let row = db
    .prepare('SELECT * FROM plan_diario WHERE usuario_id = ? AND fecha = ?')
    .get(usuario_id, fecha) as PlanRow | undefined;

  if (!row) {
    const info = db
      .prepare('INSERT INTO plan_diario (usuario_id, fecha) VALUES (?, ?)')
      .run(usuario_id, fecha);
    row = db.prepare('SELECT * FROM plan_diario WHERE id = ?').get(info.lastInsertRowid) as PlanRow;
  }

  db.prepare(`UPDATE plan_diario SET ${slot}_id = ? WHERE id = ?`).run(receta_id ?? null, row.id);

  const actualizado = db
    .prepare('SELECT * FROM plan_diario WHERE id = ?')
    .get(row.id) as PlanRow;
  return NextResponse.json(planRowToJSON(db, actualizado));
}
