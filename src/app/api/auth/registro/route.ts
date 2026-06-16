import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import getDb from '@/lib/db';
import { firmarToken, setAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { nombre, email, password, objetivo, datos_fisicos } = body ?? {};

  if (!nombre || !email || !password) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'La contrasena debe tener al menos 6 caracteres' }, { status: 400 });
  }

  const db = getDb();
  const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existente) {
    return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 });
  }

  const id = randomUUID();
  const password_hash = await bcrypt.hash(password, 10);

  db.prepare(
    'INSERT INTO usuarios (id, nombre, email, password_hash, objetivo_calorias, objetivo_proteinas, objetivo_carbohidratos, objetivo_grasas, objetivo_comidas, tema, datos_fisicos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    nombre,
    email,
    password_hash,
    objetivo?.calorias ?? 2000,
    objetivo?.proteinas ?? 150,
    objetivo?.carbohidratos ?? 200,
    objetivo?.grasas ?? 65,
    objetivo?.comidas ?? 3,
    'oscuro',
    datos_fisicos ? JSON.stringify(datos_fisicos) : null,
  );

  const token = firmarToken({ sub: id, email });
  setAuthCookie(token);

  return NextResponse.json({ id, nombre, email });
}
