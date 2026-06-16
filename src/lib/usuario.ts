import type { UserProfile } from '@/types';

const KEY = 'userProfile';

/**
 * Lee el perfil del usuario.
 * Primero intenta /api/auth/me (DB). Si falla, lee localStorage como fallback
 * (compatibilidad con sesiones anteriores al sistema de auth).
 * Solo usar en componentes cliente con await.
 */
export async function getUserAsync(): Promise<UserProfile | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) return res.json() as Promise<UserProfile>;
  } catch {
    // red no disponible
  }
  // Fallback: localStorage (sesiones pre-auth)
  return getUserLocal();
}

/** Lee el perfil del localStorage de forma sincrona (uso legacy). */
export function getUser(): UserProfile | null {
  return getUserLocal();
}

function getUserLocal(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

/**
 * Guarda el perfil en localStorage.
 * Usado durante el onboarding hasta que el registro en DB confirme el usuario.
 */
export function saveUser(perfil: UserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(perfil));
}

/** Limpia el localStorage (llamar tras login exitoso en DB). */
export function clearUserLocal(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

export function aplicarTema(tema: 'oscuro' | 'claro'): void {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('tema-claro', tema === 'claro');
}
