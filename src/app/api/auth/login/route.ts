import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { firmarToken, setAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface UsuarioRow {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { email, password } = body ?? {};

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contrasena requeridos' }, { status: 400 });
  }

  const db = getDb();
  const usuario = db.prepare('SELECT id, nombre, email, password_hash FROM usuarios WHERE email = ?').get(email) as UsuarioRow | undefined;

  if (!usuario) {
    return NextResponse.json({ error: 'Email o contrasena incorrectos' }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, usuario.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Email o contrasena incorrectos' }, { status: 401 });
  }

  const token = firmarToken({ sub: usuario.id, email: usuario.email });
  setAuthCookie(token);

  return NextResponse.json({ id: usuario.id, nombre: usuario.nombre, email: usuario.email });
}
