import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { rowToReceta, RecetaRow } from '@/lib/recetas';
import { generarPlan, escalarPlan, type ObjetivoPlan } from '@/lib/plan';
import { getSesion } from '@/lib/auth';
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

interface UsuarioObjRow {
  objetivo_calorias: number;
  objetivo_proteinas: number;
  objetivo_carbohidratos: number;
  objetivo_grasas: number;
  objetivo_comidas: number;
}

const SLOTS: TipoComida[] = ['desayuno', 'almuerzo', 'merienda', 'cena'];

/** Objetivo diario del usuario (fuente de verdad: tabla usuarios, no el cliente). */
function cargarObjetivo(db: ReturnType<typeof getDb>, usuario_id: string): ObjetivoPlan {
  const u = db
    .prepare(
      'SELECT objetivo_calorias, objetivo_proteinas, objetivo_carbohidratos, objetivo_grasas, objetivo_comidas FROM usuarios WHERE id = ?'
    )
    .get(usuario_id) as UsuarioObjRow | undefined;
  return {
    calorias: u?.objetivo_calorias ?? 2000,
    comidas: u?.objetivo_comidas ?? 3,
    proteinas: u?.objetivo_proteinas ?? 150,
    carbohidratos: u?.objetivo_carbohidratos ?? 200,
    grasas: u?.objetivo_grasas ?? 65,
  };
}

function getReceta(db: ReturnType<typeof getDb>, id: number | null): Receta | undefined {
  if (!id) return undefined;
  const row = db.prepare('SELECT * FROM recetas WHERE id = ?').get(id) as RecetaRow | undefined;
  return row ? rowToReceta(row) : undefined;
}

/** Arma el JSON del plan con las porciones ya escaladas al objetivo del día. */
function planRowToJSON(
  db: ReturnType<typeof getDb>,
  row: PlanRow | undefined,
  objetivo: ObjetivoPlan
) {
  if (!row) return null;
  const plan: Partial<Record<TipoComida, Receta>> = {};
  const d = getReceta(db, row.desayuno_id);
  const a = getReceta(db, row.almuerzo_id);
  const m = getReceta(db, row.merienda_id);
  const c = getReceta(db, row.cena_id);
  if (d) plan.desayuno = d;
  if (a) plan.almuerzo = a;
  if (m) plan.merienda = m;
  if (c) plan.cena = c;
  const esc = escalarPlan(plan, objetivo);
  return {
    id: row.id,
    usuario_id: row.usuario_id,
    fecha: row.fecha,
    desayuno: esc.desayuno ?? null,
    almuerzo: esc.almuerzo ?? null,
    merienda: esc.merienda ?? null,
    cena: esc.cena ?? null,
  };
}

/** GET /api/plan?fecha= → plan del día (o null). El usuario_id sale de la sesión. */
export async function GET(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const usuario_id = sesion.sub;

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get('fecha');
  if (!fecha) {
    return NextResponse.json({ error: 'Falta fecha' }, { status: 400 });
  }

  const objetivo = cargarObjetivo(db, usuario_id);
  const row = db
    .prepare('SELECT * FROM plan_diario WHERE usuario_id = ? AND fecha = ?')
    .get(usuario_id, fecha) as PlanRow | undefined;

  return NextResponse.json(planRowToJSON(db, row, objetivo));
}

/** POST /api/plan { fecha } → genera y guarda un plan nuevo según el objetivo del usuario. */
export async function POST(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const usuario_id = sesion.sub;

  const db = getDb();
  const body = await req.json();
  const { fecha } = body ?? {};
  if (!fecha) {
    return NextResponse.json({ error: 'Falta fecha' }, { status: 400 });
  }

  const objetivo = cargarObjetivo(db, usuario_id);
  const plan = generarPlan(db, objetivo, usuario_id);

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
  return NextResponse.json(planRowToJSON(db, row, objetivo));
}

/**
 * PATCH /api/plan { fecha, slot, receta_id }
 * Asigna una receta concreta a un slot (crea el plan del día si no existe).
 */
export async function PATCH(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const usuario_id = sesion.sub;

  const db = getDb();
  const b = await req.json();
  const { fecha, slot, receta_id } = b ?? {};
  if (!fecha || !slot || !SLOTS.includes(slot)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }

  // Validar que la receta exista (si se manda una) para no dejar un slot colgado.
  if (receta_id != null) {
    const existe = db.prepare('SELECT 1 FROM recetas WHERE id = ?').get(receta_id);
    if (!existe) return NextResponse.json({ error: 'Receta inexistente' }, { status: 400 });
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

  const objetivo = cargarObjetivo(db, usuario_id);
  const actualizado = db
    .prepare('SELECT * FROM plan_diario WHERE id = ?')
    .get(row.id) as PlanRow;
  return NextResponse.json(planRowToJSON(db, actualizado, objetivo));
}
