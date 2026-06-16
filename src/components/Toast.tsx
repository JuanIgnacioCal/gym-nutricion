'use client';
import { useCallback, useState } from 'react';

interface ToastState {
  mensaje: string;
  visible: boolean;
}

/** Hook simple de toast: devuelve el nodo a renderizar y una función para dispararlo. */
export function useToast() {
  const [estado, setEstado] = useState<ToastState>({ mensaje: '', visible: false });

  const mostrar = useCallback((mensaje: string) => {
    setEstado({ mensaje, visible: true });
    window.setTimeout(() => setEstado((s) => ({ ...s, visible: false })), 2000);
  }, []);

  const toast = estado.visible ? (
    <div
      className="animar-toast fixed left-1/2 z-50 rounded-btn px-4 py-3 text-sm font-medium shadow-lg"
      style={{
        bottom: 'calc(var(--alto-nav) + 16px)',
        background: 'var(--color-superficie-alt)',
        color: 'var(--color-texto)',
        border: '1px solid var(--color-borde)',
        maxWidth: '90vw',
      }}
    >
      {estado.mensaje}
    </div>
  ) : null;

  return { toast, mostrar };
}
