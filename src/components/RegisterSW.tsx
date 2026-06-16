'use client';
import { useEffect } from 'react';

/** Registra el service worker (solo en producción para no molestar en dev). */
export default function RegisterSW() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registro fallido: la app sigue funcionando sin offline */
      });
    }
  }, []);
  return null;
}
