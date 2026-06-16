import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware de autenticacion (PENDIENTE DE ACTIVAR).
 *
 * El sistema de auth esta implementado (JWT + cookie httpOnly) pero la
 * proteccion de rutas esta desactivada mientras los usuarios migran de
 * localStorage a la DB. Activar cuando el flujo de login este completo:
 *
 *   import { verificarToken } from '@/lib/auth';
 *   const token = req.cookies.get('auth_token')?.value;
 *   if (!token || !verificarToken(token)) { ... redirigir ... }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
