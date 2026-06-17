import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET: string = process.env.JWT_SECRET ?? (() => {
  throw new Error(
    'JWT_SECRET no está definida: es obligatoria para firmar las sesiones de forma segura. Seteala en las variables de entorno.'
  );
})();
const COOKIE = 'auth_token';
const EXPIRY = 60 * 60 * 24 * 30; // 30 dias en segundos

export interface JwtPayload {
  sub: string;   // usuario_id
  email: string;
}

export function firmarToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

export function verificarToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: EXPIRY,
    path: '/',
  });
}

export function clearAuthCookie() {
  cookies().set(COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
}

export function getTokenFromCookies(): string | undefined {
  return cookies().get(COOKIE)?.value;
}

/**
 * Lee y verifica la sesión actual desde la cookie httpOnly.
 * Devuelve el payload del JWT (sub = usuario_id) o null si no hay cookie o
 * la firma es inválida. Es la fuente de verdad de identidad: los endpoints
 * deben derivar el usuario_id de acá, NUNCA de un parámetro del cliente.
 */
export function getSesion(): JwtPayload | null {
  const token = getTokenFromCookies();
  if (!token) return null;
  return verificarToken(token);
}
