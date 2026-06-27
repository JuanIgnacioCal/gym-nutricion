import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { rowToReceta, RecetaRow } from '@/lib/recetas';
import { getSesion } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/recetas?categoria=&tipo=&buscar=&limite=
 * Lista recetas con filtros opcionales.
 */
export async function GET(req: NextRequest) {
  const sesion = getSesion();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get('categoria');
  const tipo = searchParams.get('tipo');
  const buscar = searchParams.get('buscar');
  const limite = Math.min(Math.max(1, Number(searchParams.get('limite')) || 200), 500);

  const where: string[] = [];
  const params: (string | number)[] = [];

  // Privacidad: cada usuario ve las recetas predefinidas + SOLO sus propias recetas.
  if (sesion) {
    // Predefinidas + las propias + las "huérfanas" sin dueño (creadas antes de este
    // campo; se le asigna dueño al editarlas).
    where.push("(origen != 'usuario' OR usuario_id = ? OR usuario_id IS NULL)");
    params.push(sesion.sub);
  } else {
    where.push("origen != 'usuario'");
  }

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
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

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
  const pasos = Array.isArray(b.pasos)
    ? b.pasos.map((s: unknown) => String(s).trim()).filter(Boolean)
    : [];

  const info = db
    .prepare(
      `INSERT INTO recetas
       (nombre, nombre_original, origen, tipo_comida, categoria,
        calorias, proteinas, carbohidratos, grasas, fibra, porciones,
        tiempo_preparacion, tiempo_coccion, tiempo_total, ingredientes, url_original, calificacion, pasos, usuario_id)
       VALUES (?, ?, 'usuario', ?, 'personalizada', ?, ?, ?, ?, ?, 1, ?, 0, ?, ?, '', 0, ?, ?)`
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
      JSON.stringify(ingredientes),
      JSON.stringify(pasos),
      sesion.sub
    );

  const row = db.prepare('SELECT * FROM recetas WHERE id = ?').get(info.lastInsertRowid) as RecetaRow;
  return NextResponse.json(rowToReceta(row), { status: 201 });
}

/**
 * PUT /api/recetas → edita una receta propia del usuario (origen 'usuario').
 * Permite editar nombre, tipo, tiempo, macros, ingredientes y pasos.
 * Las recetas predefinidas no se pueden editar (403).
 */
export async function PUT(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const db = getDb();
  const b = await req.json();
  const id = Number(b?.id);
  if (!id) return NextResponse.json({ error: 'Falta el id de la receta' }, { status: 400 });

  const row = db.prepare('SELECT * FROM recetas WHERE id = ?').get(id) as
    | (RecetaRow & { usuario_id: string | null })
    | undefined;
  if (!row) return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 });
  // Solo el dueño puede editar su receta. Las "huérfanas" (sin dueño, de antes de este
  // campo) se pueden editar y quedan asignadas a quien las edita.
  if (row.origen !== 'usuario' || (row.usuario_id !== null && row.usuario_id !== sesion.sub)) {
    return NextResponse.json({ error: 'Solo podés editar tus propias recetas' }, { status: 403 });
  }

  const nombre = typeof b.nombre === 'string' && b.nombre.trim() ? b.nombre.trim() : row.nombre;
  const slot = String(b.tipo_comida ?? '');
  const tipo_comida =
    slot === 'desayuno' || slot === 'merienda'
      ? 'desayuno/merienda'
      : slot === 'almuerzo' || slot === 'cena'
        ? 'almuerzo/cena'
        : row.tipo_comida;
  const ingredientes = Array.isArray(b.ingredientes)
    ? b.ingredientes.map(String)
    : JSON.parse(row.ingredientes || '[]');
  const pasos = Array.isArray(b.pasos)
    ? b.pasos.map((s: unknown) => String(s).trim()).filter(Boolean)
    : row.pasos
      ? JSON.parse(row.pasos)
      : [];
  const num = (v: unknown, fallback: number) => (v == null || v === '' ? fallback : Number(v) || 0);
  const prep = num(b.tiempo_preparacion, row.tiempo_preparacion);

  db.prepare(
    `UPDATE recetas SET nombre = ?, nombre_original = ?, tipo_comida = ?,
       calorias = ?, proteinas = ?, carbohidratos = ?, grasas = ?, fibra = ?,
       tiempo_preparacion = ?, tiempo_total = ?, ingredientes = ?, pasos = ?, usuario_id = ?
     WHERE id = ?`
  ).run(
    nombre,
    nombre,
    tipo_comida,
    Math.round(num(b.calorias, row.calorias)),
    num(b.proteinas, row.proteinas),
    num(b.carbohidratos, row.carbohidratos),
    num(b.grasas, row.grasas),
    num(b.fibra, row.fibra),
    prep,
    prep,
    JSON.stringify(ingredientes),
    JSON.stringify(pasos),
    sesion.sub,
    id
  );

  const updated = db.prepare('SELECT * FROM recetas WHERE id = ?').get(id) as RecetaRow;
  return NextResponse.json(rowToReceta(updated));
}
