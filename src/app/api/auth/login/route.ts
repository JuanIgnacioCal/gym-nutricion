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

// Hash dummy (se calcula una vez al cargar el módulo) para comparar SIEMPRE, incluso
// si el email no existe, y así no filtrar por tiempo de respuesta qué emails están registrados.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy', 10);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { email, password } = body ?? {};

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contrasena requeridos' }, { status: 400 });
  }

  const db = getDb();
  const usuario = db.prepare('SELECT id, nombre, email, password_hash FROM usuarios WHERE email = ?').get(email) as UsuarioRow | undefined;

  // Comparamos siempre (hash dummy si el email no existe) para igualar el tiempo de respuesta.
  const ok = await bcrypt.compare(password, usuario?.password_hash ?? DUMMY_HASH);
  if (!usuario || !ok) {
    return NextResponse.json({ error: 'Email o contrasena incorrectos' }, { status: 401 });
  }

  const token = firmarToken({ sub: usuario.id, email: usuario.email });
  setAuthCookie(token);

  return NextResponse.json({ id: usuario.id, nombre: usuario.nombre, email: usuario.email });
}
