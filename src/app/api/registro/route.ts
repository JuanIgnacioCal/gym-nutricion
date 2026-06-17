import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSesion } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/registro?usuario_id=&fecha= → registros del día. */
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

  const rows = db
    .prepare(
      `SELECT * FROM registro_diario
       WHERE usuario_id = ? AND fecha = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(usuario_id, fecha);

  return NextResponse.json(rows);
}

/** POST /api/registro → crea un registro de comida. */
export async function POST(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const usuario_id = sesion.sub;

  const db = getDb();
  const b = await req.json();

  const required = ['fecha', 'tipo_comida', 'nombre_comida'];
  for (const k of required) {
    if (!b?.[k]) return NextResponse.json({ error: `Falta ${k}` }, { status: 400 });
  }

  const info = db
    .prepare(
      `INSERT INTO registro_diario
       (usuario_id, fecha, tipo_comida, receta_id, nombre_comida,
        calorias, proteinas, carbohidratos, grasas, fibra, gramos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      usuario_id,
      b.fecha,
      b.tipo_comida,
      b.receta_id ?? null,
      b.nombre_comida,
      Math.round(Number(b.calorias) || 0),
      Number(b.proteinas) || 0,
      Number(b.carbohidratos) || 0,
      Number(b.grasas) || 0,
      Number(b.fibra) || 0,
      Number(b.gramos) || 100
    );

  const row = db.prepare('SELECT * FROM registro_diario WHERE id = ?').get(info.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}

/** DELETE /api/registro?id= → elimina un registro. */
export async function DELETE(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const usuario_id = sesion.sub;

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  // Solo borra si el registro pertenece al usuario de la sesión.
  const info = db
    .prepare('DELETE FROM registro_diario WHERE id = ? AND usuario_id = ?')
    .run(Number(id), usuario_id);
  if (info.changes === 0) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
