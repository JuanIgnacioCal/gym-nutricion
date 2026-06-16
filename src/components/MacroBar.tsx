'use client';
import { colorPorcentaje } from '@/lib/util';

interface MacroBarProps {
  label: string;
  consumido: number;
  objetivo: number;
  unidad?: string;
}

export default function MacroBar({ label, consumido, objetivo, unidad = 'g' }: MacroBarProps) {
  const pct = objetivo > 0 ? (consumido / objetivo) * 100 : 0;
  const color = colorPorcentaje(consumido, objetivo);
  const ancho = Math.min(pct, 100);

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1 text-sm">
        <span style={{ color: 'var(--color-texto)' }}>{label}</span>
        <span style={{ color: 'var(--color-texto-sec)' }}>
          {Math.round(consumido)}{unidad} / {Math.round(objetivo)}{unidad}{' '}
          <span style={{ color }}>({Math.round(pct)}%)</span>
        </span>
      </div>
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--color-borde)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${ancho}%`, background: color }}
        />
      </div>
    </div>
  );
}
