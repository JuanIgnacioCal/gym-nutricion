'use client';
import { useState } from 'react';
import { X, KeyRound } from 'lucide-react';

interface CambiarClaveModalProps {
  onClose: () => void;
  /** Se llama con un mensaje de éxito para mostrar el toast. */
  onDone: (mensaje: string) => void;
}

/**
 * Modal de autoservicio: el propio usuario cambia su contraseña.
 * Pide la clave actual + la nueva dos veces. Los campos van con type=password
 * (a diferencia del reset del dueño, acá el usuario ya conoce su clave).
 */
export default function CambiarClaveModal({ onClose, onDone }: CambiarClaveModalProps) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [nueva2, setNueva2] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    setError('');
    if (nueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nueva !== nueva2) {
      setError('Las dos contraseñas nuevas no coinciden.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/auth/cambiar-clave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claveActual: actual, nuevaClave: nueva }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error || 'No se pudo cambiar la contraseña.');
      }
      onDone('Contraseña actualizada.');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setEnviando(false);
    }
  };

  const inputStyle = {
    background: 'var(--color-superficie-alt)',
    border: '1px solid var(--color-borde)',
    color: 'var(--color-texto)',
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="animar-entrada w-full sm:max-w-sm max-h-[92vh] overflow-y-auto rounded-t-card sm:rounded-card"
        style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--color-borde)' }}
        >
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <KeyRound size={18} style={{ color: 'var(--color-primario)' }} /> Cambiar contraseña
          </h2>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <label className="block">
            <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
              Contraseña actual
            </span>
            <input
              type="password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-btn px-3 py-2.5 outline-none"
              style={inputStyle}
            />
          </label>

          <label className="block">
            <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
              Nueva contraseña
            </span>
            <input
              type="password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              className="mt-1 w-full rounded-btn px-3 py-2.5 outline-none"
              style={inputStyle}
            />
          </label>

          <label className="block">
            <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
              Repetir nueva contraseña
            </span>
            <input
              type="password"
              value={nueva2}
              onChange={(e) => setNueva2(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && guardar()}
              autoComplete="new-password"
              className="mt-1 w-full rounded-btn px-3 py-2.5 outline-none"
              style={inputStyle}
            />
          </label>

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-error)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-btn px-4 py-2.5 text-sm font-semibold"
              style={{ border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={enviando}
              className="flex-1 rounded-btn px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
            >
              {enviando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
