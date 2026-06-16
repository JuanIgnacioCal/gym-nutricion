'use client';
import { useEffect, useState } from 'react';

export interface GymPublic {
  nombre: string;
  tagline: string;
  logo: string;
}

const FALLBACK: GymPublic = {
  nombre: process.env.NEXT_PUBLIC_GYM_NOMBRE ?? 'Mi Gimnasio',
  tagline: 'Tu nutrición, tu rendimiento',
  logo: '/logo.png',
};

/** Hook cliente que obtiene la info pública del gym desde /api/config. */
export function useGymConfig(): GymPublic {
  const [config, setConfig] = useState<GymPublic>(FALLBACK);

  useEffect(() => {
    let activo = true;
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : FALLBACK))
      .then((data) => activo && setConfig(data))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  return config;
}
