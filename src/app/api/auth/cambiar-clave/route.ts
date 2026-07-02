import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { getSesion } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/cambiar-clave — el propio usuario cambia su contraseña.
 *
 * Requiere la clave actual (para que no le cambien la clave a alguien que dejó
 * la sesión abierta). La identidad sale SIEMPRE de la cookie de sesión
 * (getSesion() verifica la firma del JWT), nunca de un parámetro del cliente.
 */
export async function POST(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const claveActual = typeof body?.claveActual === 'string' ? body.claveActual : '';
  const nuevaClave = typeof body?.nuevaClave === 'string' ? body.nuevaClave : '';

  if (nuevaClave.length < 6) {
    return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare('SELECT password_hash FROM usuarios WHERE id = ?')
    .get(sesion.sub) as { password_hash: string } | undefined;
  if (!row) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const ok = await bcrypt.compare(claveActual, row.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 });
  }

  const nuevoHash = await bcrypt.hash(nuevaClave, 10);
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(nuevoHash, sesion.sub);

  return NextResponse.json({ ok: true });
}
