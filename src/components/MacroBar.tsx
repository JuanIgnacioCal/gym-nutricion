'use client';

interface MacroBarProps {
  label: string;
  consumido: number;
  objetivo: number;
  unidad?: string;
}

/** Barra de progreso de macro, estilo prototipo: track tenue + fill dorado. */
export default function MacroBar({ label, consumido, objetivo, unidad = 'g' }: MacroBarProps) {
  const pct = objetivo > 0 ? (consumido / objetivo) * 100 : 0;
  const ancho = Math.min(pct, 100);

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-bold" style={{ color: 'var(--color-texto)' }}>
          {label}
        </span>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-texto-sec)' }}>
          {Math.round(consumido)}
          {unidad} / {Math.round(objetivo)}
          {unidad}{' '}
          <span style={{ color: 'var(--color-primario)', fontWeight: 700 }}>({Math.round(pct)}%)</span>
        </span>
      </div>
      <div
        className="h-[7px] w-full overflow-hidden rounded-[5px]"
        style={{ background: 'var(--color-superficie-alt)' }}
      >
        <div
          className="h-full rounded-[5px] transition-all duration-700"
          style={{ width: `${ancho}%`, background: 'var(--gradiente-dorado)' }}
        />
      </div>
    </div>
  );
}
