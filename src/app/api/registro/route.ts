import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/registro?usuario_id=&fecha= → registros del día. */
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const usuario_id = searchParams.get('usuario_id');
  const fecha = searchParams.get('fecha');

  if (!usuario_id || !fecha) {
    return NextResponse.json({ error: 'Faltan usuario_id o fecha' }, { status: 400 });
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
  const db = getDb();
  const b = await req.json();

  const required = ['usuario_id', 'fecha', 'tipo_comida', 'nombre_comida'];
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
      b.usuario_id,
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
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  db.prepare('DELETE FROM registro_diario WHERE id = ?').run(Number(id));
  return NextResponse.json({ ok: true });
}
