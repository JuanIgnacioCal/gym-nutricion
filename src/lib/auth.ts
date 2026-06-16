import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-cambiar-en-produccion';
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
