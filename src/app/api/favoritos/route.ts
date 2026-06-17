import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { rowToReceta, RecetaRow } from '@/lib/recetas';
import { getSesion } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface FavRow {
  id: number;
  usuario_id: string;
  receta_id: number | null;
  comida_personalizada: string | null;
  tipo: 'receta' | 'personalizado';
  created_at: string;
}

/** GET /api/favoritos?usuario_id=&tipo= → lista de favoritos (con receta o alimento embebido). */
export async function GET(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const usuario_id = sesion.sub;

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get('tipo');

  const where = ['usuario_id = ?'];
  const params: (string | number)[] = [usuario_id];
  if (tipo) {
    where.push('tipo = ?');
    params.push(tipo);
  }

  const rows = db
    .prepare(`SELECT * FROM favoritos WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id DESC`)
    .all(...params) as FavRow[];

  const result = rows.map((f) => {
    if (f.tipo === 'receta' && f.receta_id) {
      const r = db.prepare('SELECT * FROM recetas WHERE id = ?').get(f.receta_id) as
        | RecetaRow
        | undefined;
      return { id: f.id, tipo: f.tipo, created_at: f.created_at, receta: r ? rowToReceta(r) : null };
    }
    let comida = null;
    try {
      comida = f.comida_personalizada ? JSON.parse(f.comida_personalizada) : null;
    } catch {
      comida = null;
    }
    return { id: f.id, tipo: f.tipo, created_at: f.created_at, comida };
  });

  return NextResponse.json(result);
}

/** POST /api/favoritos → crea un favorito (receta o alimento personalizado). */
export async function POST(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const usuario_id = sesion.sub;

  const db = getDb();
  const b = await req.json();

  const tipo = b.tipo === 'personalizado' ? 'personalizado' : 'receta';

  if (tipo === 'receta') {
    if (!b.receta_id) return NextResponse.json({ error: 'Falta receta_id' }, { status: 400 });
    // Evitar duplicados.
    const existe = db
      .prepare('SELECT id FROM favoritos WHERE usuario_id = ? AND receta_id = ? AND tipo = ?')
      .get(usuario_id, b.receta_id, 'receta') as { id: number } | undefined;
    if (existe) return NextResponse.json({ id: existe.id, duplicado: true });

    const info = db
      .prepare('INSERT INTO favoritos (usuario_id, receta_id, tipo) VALUES (?, ?, ?)')
      .run(usuario_id, b.receta_id, 'receta');
    return NextResponse.json({ id: info.lastInsertRowid }, { status: 201 });
  }

  // personalizado: comida_personalizada es un objeto/string con macros por 100g.
  const payload =
    typeof b.comida_personalizada === 'string'
      ? b.comida_personalizada
      : JSON.stringify(b.comida_personalizada ?? {});

  const info = db
    .prepare('INSERT INTO favoritos (usuario_id, comida_personalizada, tipo) VALUES (?, ?, ?)')
    .run(usuario_id, payload, 'personalizado');
  return NextResponse.json({ id: info.lastInsertRowid }, { status: 201 });
}

/** DELETE /api/favoritos?id= → elimina un favorito. */
export async function DELETE(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const usuario_id = sesion.sub;

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  // Solo borra si el favorito pertenece al usuario de la sesión.
  const info = db
    .prepare('DELETE FROM favoritos WHERE id = ? AND usuario_id = ?')
    .run(Number(id), usuario_id);
  if (info.changes === 0) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
