'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useGymConfig } from '@/lib/useGymConfig';
import { clearUserLocal } from '@/lib/usuario';

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 54,
  borderRadius: 16,
  padding: '0 18px',
  fontSize: '16px',
  fontWeight: 600,
  outline: 'none',
  background: 'var(--color-superficie-alt)',
  border: '1px solid var(--color-borde)',
  color: 'var(--color-texto)',
};

export default function LoginPage() {
  const router = useRouter();
  const gym = useGymConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const ingresar = async () => {
    if (cargando) return;
    if (!email.trim() || !password) {
      setError('Completá email y contraseña.');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.ok) {
        clearUserLocal();
        // Volver a la pagina que el usuario queria entrar (la setea el middleware en ?next=).
        const next = new URLSearchParams(window.location.search).get('next');
        router.replace(next && next.startsWith('/') ? next : '/plan');
        return;
      }
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? 'No pudimos iniciar sesión.');
      setCargando(false);
    } catch {
      setError('Sin conexión. Revisá tu internet e intentá de nuevo.');
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col px-4">
      <div className="flex-1 flex flex-col justify-center gap-5 w-full max-w-sm mx-auto">
        <div className="flex flex-col items-center text-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gym.logo}
            alt={gym.nombre}
            className="h-20 w-20 rounded-card object-cover"
            style={{ background: 'var(--color-superficie)' }}
            onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
          />
          <h1 className="text-[28px] font-extrabold" style={{ letterSpacing: '-0.6px' }}>Iniciar sesión</h1>
          <p className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>{gym.nombre}</p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            ingresar();
          }}
        >
          <label className="block">
            <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@email.com"
              autoComplete="email"
              className="mt-1"
              style={inputStyle}
            />
          </label>

          <label className="block">
            <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              autoComplete="current-password"
              className="mt-1"
              style={inputStyle}
            />
          </label>

          {error && (
            <p className="text-sm text-center" style={{ color: 'var(--color-error)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="btn-dorado mt-1 inline-flex w-full items-center justify-center gap-1.5 text-base font-extrabold transition-opacity disabled:opacity-50"
            style={{ height: 56, borderRadius: 18 }}
          >
            {cargando ? 'Ingresando…' : 'Ingresar'} <ChevronRight size={18} />
          </button>
        </form>

        <p className="text-sm text-center" style={{ color: 'var(--color-texto-sec)' }}>
          ¿No tenés cuenta?{' '}
          <Link href="/onboarding" style={{ color: 'var(--color-primario)', fontWeight: 600 }}>
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}
