import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { rowToReceta, RecetaRow } from '@/lib/recetas';
import { generarPlan, escalarPlan, type ObjetivoPlan } from '@/lib/plan';
import { getSesion } from '@/lib/auth';
import type { Receta, TipoComida, PlanDiaJSON, PlanSemana } from '@/types';

export const dynamic = 'force-dynamic';

const SLOTS: TipoComida[] = ['desayuno', 'almuerzo', 'merienda', 'cena'];
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

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

/** Serializa una fila de plan_diario con las porciones escaladas al objetivo. null si está vacía. */
function serializarDia(
  db: ReturnType<typeof getDb>,
  fecha: string,
  row: PlanRow | undefined,
  objetivo: ObjetivoPlan
): PlanDiaJSON | null {
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
  if (Object.keys(plan).length === 0) return null;
  const esc = escalarPlan(plan, objetivo);
  return {
    fecha,
    desayuno: esc.desayuno ?? null,
    almuerzo: esc.almuerzo ?? null,
    merienda: esc.merienda ?? null,
    cena: esc.cena ?? null,
  };
}

/** Las 7 fechas (YYYY-MM-DD) desde `inicio`, en UTC para no tener corrimientos de zona horaria. */
function fechasDeSemana(inicio: string): string[] {
  const [y, m, d] = inicio.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(base);
    dt.setUTCDate(dt.getUTCDate() + i);
    out.push(dt.toISOString().slice(0, 10));
  }
  return out;
}

/** GET /api/plan/semana?inicio=YYYY-MM-DD → los 7 planes existentes de esa semana. */
export async function GET(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const usuario_id = sesion.sub;

  const inicio = new URL(req.url).searchParams.get('inicio');
  if (!inicio || !RE_FECHA.test(inicio)) {
    return NextResponse.json({ error: 'Falta inicio (YYYY-MM-DD)' }, { status: 400 });
  }

  const db = getDb();
  const objetivo = cargarObjetivo(db, usuario_id);
  const fechas = fechasDeSemana(inicio);
  const dias = fechas.map((f) => {
    const row = db
      .prepare('SELECT * FROM plan_diario WHERE usuario_id = ? AND fecha = ?')
      .get(usuario_id, f) as PlanRow | undefined;
    return serializarDia(db, f, row, objetivo);
  });

  const resp: PlanSemana = { inicio, dias };
  return NextResponse.json(resp);
}

/** POST /api/plan/semana { inicio } → genera y guarda los 7 días de la semana. */
export async function POST(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const usuario_id = sesion.sub;

  const body = await req.json().catch(() => null);
  const inicio = body?.inicio;
  if (!inicio || typeof inicio !== 'string' || !RE_FECHA.test(inicio)) {
    return NextResponse.json({ error: 'Falta inicio (YYYY-MM-DD)' }, { status: 400 });
  }

  const db = getDb();
  const objetivo = cargarObjetivo(db, usuario_id);
  const fechas = fechasDeSemana(inicio);

  const del = db.prepare('DELETE FROM plan_diario WHERE usuario_id = ? AND fecha = ?');
  const ins = db.prepare(
    'INSERT INTO plan_diario (usuario_id, fecha, desayuno_id, almuerzo_id, merienda_id, cena_id) VALUES (?, ?, ?, ?, ?, ?)'
  );

  // Genera día por día EN ORDEN, guardando cada uno antes de generar el siguiente.
  // Así recetasRecientes() (mira los últimos 14 días en plan_diario) ya ve los días
  // recién creados y NO repite recetas entre los días de la semana.
  for (const f of fechas) {
    const plan = generarPlan(db, objetivo, usuario_id);
    del.run(usuario_id, f);
    ins.run(
      usuario_id,
      f,
      plan.desayuno?.id ?? null,
      plan.almuerzo?.id ?? null,
      plan.merienda?.id ?? null,
      plan.cena?.id ?? null
    );
  }

  const dias = fechas.map((f) => {
    const row = db
      .prepare('SELECT * FROM plan_diario WHERE usuario_id = ? AND fecha = ?')
      .get(usuario_id, f) as PlanRow | undefined;
    return serializarDia(db, f, row, objetivo);
  });

  const resp: PlanSemana = { inicio, dias };
  return NextResponse.json(resp);
}
