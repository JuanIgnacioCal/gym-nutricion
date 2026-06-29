'use client';
import { useState } from 'react';
import { X, KeyRound } from 'lucide-react';

interface ResetClaveModalProps {
  /** Socio al que se le va a resetear la clave. */
  socio: { id: string; nombre: string; email: string };
  onClose: () => void;
  /** Se llama con un mensaje de éxito para mostrar el toast en el panel. */
  onDone: (mensaje: string) => void;
}

/**
 * Modal del panel del dueño para ponerle una clave nueva a un socio (recupero
 * interino, sin email). El dueño escribe la clave dos veces y se la pasa al socio.
 * La clave se muestra en texto plano a propósito: el dueño necesita poder leerla
 * para comunicársela.
 */
export default function ResetClaveModal({ socio, onClose, onDone }: ResetClaveModalProps) {
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const guardar = async () => {
    setError('');
    if (clave.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (clave !== clave2) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch('/api/panel/reset-clave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socioId: socio.id, nuevaClave: clave }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error || 'No se pudo actualizar la clave.');
      }
      onDone(`Clave de ${socio.nombre} actualizada.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la clave.');
    } finally {
      setEnviando(false);
    }
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
            <KeyRound size={18} style={{ color: 'var(--color-primario)' }} /> Resetear clave
          </h2>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
            Le vas a poner una clave nueva a{' '}
            <b style={{ color: 'var(--color-texto)' }}>{socio.nombre}</b> ({socio.email}). Después
            pasásela para que entre y la use.
          </p>

          <label className="block">
            <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
              Nueva clave
            </span>
            <input
              type="text"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              className="mt-1 w-full rounded-btn px-3 py-2.5 outline-none"
              style={{
                background: 'var(--color-superficie-alt)',
                border: '1px solid var(--color-borde)',
                color: 'var(--color-texto)',
              }}
            />
          </label>

          <label className="block">
            <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
              Repetir clave
            </span>
            <input
              type="text"
              value={clave2}
              onChange={(e) => setClave2(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && guardar()}
              placeholder="Volvé a escribirla"
              autoComplete="new-password"
              className="mt-1 w-full rounded-btn px-3 py-2.5 outline-none"
              style={{
                background: 'var(--color-superficie-alt)',
                border: '1px solid var(--color-borde)',
                color: 'var(--color-texto)',
              }}
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
              {enviando ? 'Guardando…' : 'Guardar clave'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
