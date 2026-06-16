import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { rowToReceta, RecetaRow } from '@/lib/recetas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/recetas?categoria=&tipo=&buscar=&limite=
 * Lista recetas con filtros opcionales.
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get('categoria');
  const tipo = searchParams.get('tipo');
  const buscar = searchParams.get('buscar');
  const limite = Number(searchParams.get('limite') ?? 200);

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (categoria && categoria !== 'todas') {
    where.push('categoria LIKE ?');
    params.push(`%${categoria}%`);
  }
  if (tipo) {
    where.push('tipo_comida LIKE ?');
    params.push(`%${tipo}%`);
  }
  if (buscar) {
    where.push('(nombre LIKE ? OR nombre_original LIKE ?)');
    params.push(`%${buscar}%`, `%${buscar}%`);
  }

  const sql = `
    SELECT * FROM recetas
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY calificacion DESC, id ASC
    LIMIT ?
  `;
  params.push(limite);

  const rows = db.prepare(sql).all(...params) as RecetaRow[];
  return NextResponse.json(rows.map(rowToReceta));
}

/**
 * POST /api/recetas → crea una receta propia del usuario (origen 'usuario').
 * Body: { nombre, tipo_comida (desayuno|almuerzo|merienda|cena), tiempo_preparacion,
 *         calorias, proteinas, carbohidratos, grasas, fibra, ingredientes: string[] }
 */
export async function POST(req: NextRequest) {
  const db = getDb();
  const b = await req.json();

  if (!b?.nombre || typeof b.nombre !== 'string' || !b.nombre.trim()) {
    return NextResponse.json({ error: 'Falta el nombre de la receta' }, { status: 400 });
  }

  // Mapear el slot elegido al tag combinado que usa el generador de plan.
  const slot = String(b.tipo_comida ?? 'almuerzo');
  const tipo_comida =
    slot === 'desayuno' || slot === 'merienda' ? 'desayuno/merienda' : 'almuerzo/cena';

  const prep = Number(b.tiempo_preparacion) || 0;
  const ingredientes = Array.isArray(b.ingredientes) ? b.ingredientes.map(String) : [];

  const info = db
    .prepare(
      `INSERT INTO recetas
       (nombre, nombre_original, origen, tipo_comida, categoria,
        calorias, proteinas, carbohidratos, grasas, fibra, porciones,
        tiempo_preparacion, tiempo_coccion, tiempo_total, ingredientes, url_original, calificacion)
       VALUES (?, ?, 'usuario', ?, 'personalizada', ?, ?, ?, ?, ?, 1, ?, 0, ?, ?, '', 0)`
    )
    .run(
      b.nombre.trim(),
      b.nombre.trim(),
      tipo_comida,
      Math.round(Number(b.calorias) || 0),
      Number(b.proteinas) || 0,
      Number(b.carbohidratos) || 0,
      Number(b.grasas) || 0,
      Number(b.fibra) || 0,
      prep,
      prep,
      JSON.stringify(ingredientes)
    );

  const row = db.prepare('SELECT * FROM recetas WHERE id = ?').get(info.lastInsertRowid) as RecetaRow;
  return NextResponse.json(rowToReceta(row), { status: 201 });
}
