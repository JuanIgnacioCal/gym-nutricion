import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware de autenticación.
 *
 * Protege todas las páginas: si no hay cookie de sesión (auth_token) redirige a
 * /login (guardando en ?next= la página a la que se quería entrar). Las rutas
 * /login y /onboarding son públicas porque sirven para entrar o crear cuenta.
 *
 * Nota de seguridad: acá solo se verifica que la cookie EXISTA, no su firma. El
 * middleware corre en el runtime Edge de Next 14, donde `jsonwebtoken` (usa crypto
 * de Node) no funciona. La verificación real de la firma del JWT la hacen los
 * endpoints de API en runtime Node (ej. /api/auth/me). Esto alcanza para la
 * redirección de UX; cada endpoint que devuelve datos debe verificar el token.
 * Si más adelante se quiere verificar la firma también acá, migrar a `jose`
 * (compatible con Edge).
 */
const RUTAS_PUBLICAS = ['/login', '/onboarding', '/legal'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('auth_token')?.value;
  const esPublica = RUTAS_PUBLICAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(ruta + '/'),
  );

  if (!token && !esPublica) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Corre en todas las páginas excepto: rutas /api, assets internos de Next y
  // cualquier archivo con extensión (logo.png, manifest.json, sw.js, favicon, etc.).
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
