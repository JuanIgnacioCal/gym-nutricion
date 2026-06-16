'use client';
import { useEffect } from 'react';
import { getUserAsync, aplicarTema } from '@/lib/usuario';

/** Lee el tema guardado y lo aplica al cargar la app (useEffect del layout). */
export default function ThemeInit() {
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const u = await getUserAsync();
      if (cancelado) return;
      aplicarTema(u?.tema ?? 'oscuro');
    })();
    return () => {
      cancelado = true;
    };
  }, []);
  return null;
}
