'use client';
import { useEffect } from 'react';
import { getUser, aplicarTema } from '@/lib/usuario';

/** Lee el tema guardado y lo aplica al cargar la app (useEffect del layout). */
export default function ThemeInit() {
  useEffect(() => {
    const u = getUser();
    aplicarTema(u?.tema ?? 'oscuro');
  }, []);
  return null;
}
