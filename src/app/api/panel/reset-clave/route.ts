import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { getSesion } from '@/lib/auth';
import { esEmailDueno } from '@/lib/gymConfig';

export const dynamic = 'force-dynamic';

interface SocioRow {
  id: string;
  nombre: string;
  email: string;
}

/**
 * POST /api/panel/reset-clave — el dueño del gym le pone una clave nueva a un socio.
 *
 * Versión interina del "recupero de contraseña": sin email. El dueño elige la nueva
 * clave y se la pasa al socio por el medio que quiera (WhatsApp, en persona).
 *
 * Seguridad: la identidad sale SIEMPRE de la cookie de sesión (getSesion(), que
 * verifica la firma del JWT). Solo el dueño (email === gym.config.json → ownerEmail)
 * puede usar este endpoint; cualquier otro usuario logueado recibe 403. El `socioId`
 * se valida contra la DB; nunca se confía en datos del cliente para la identidad.
 *
 * Limitación conocida: como las sesiones son JWT sin estado, una sesión vieja del
 * socio sigue válida hasta que expire aunque se le cambie la clave. En la práctica el
 * reset se usa cuando el socio está afuera (olvidó la clave), así que no tiene sesión activa.
 */
export async function POST(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  if (!esEmailDueno(sesion.email)) {
    return NextResponse.json({ error: 'Acceso solo para el dueño del gym' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const socioId = typeof body?.socioId === 'string' ? body.socioId.trim() : '';
  const nuevaClave = typeof body?.nuevaClave === 'string' ? body.nuevaClave : '';

  if (!socioId) {
    return NextResponse.json({ error: 'Falta indicar el socio' }, { status: 400 });
  }
  if (nuevaClave.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }

  const db = getDb();
  const socio = db
    .prepare('SELECT id, nombre, email FROM usuarios WHERE id = ?')
    .get(socioId) as SocioRow | undefined;

  if (!socio) {
    return NextResponse.json({ error: 'No se encontró ese socio' }, { status: 404 });
  }

  const password_hash = await bcrypt.hash(nuevaClave, 10);
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(password_hash, socio.id);

  return NextResponse.json({
    ok: true,
    socio: { id: socio.id, nombre: socio.nombre, email: socio.email },
  });
}
