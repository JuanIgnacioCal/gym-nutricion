'use client';

interface MacroRingProps {
  consumido: number;
  objetivo: number;
  /** Radio del anillo en px (40 header chico, 60 detalle). */
  radio?: number;
  unidad?: string;
  label?: string;
}

export default function MacroRing({
  consumido,
  objetivo,
  radio = 40,
  unidad = 'kcal',
  label,
}: MacroRingProps) {
  const stroke = radio >= 60 ? 8 : 6;
  const r = radio - stroke;
  const circ = 2 * Math.PI * r;
  const pct = objetivo > 0 ? Math.min(consumido / objetivo, 1) : 0;
  const offset = circ * (1 - pct);
  const size = radio * 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={radio}
            cy={radio}
            r={r}
            fill="none"
            stroke="var(--color-borde)"
            strokeWidth={stroke}
          />
          <circle
            cx={radio}
            cy={radio}
            r={r}
            fill="none"
            stroke="var(--color-primario)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold leading-none"
            style={{ color: 'var(--color-acento)', fontSize: radio >= 60 ? 20 : 14 }}
          >
            {Math.round(consumido)}
          </span>
          <span style={{ color: 'var(--color-texto-sec)', fontSize: 10 }}>{unidad}</span>
        </div>
      </div>
      {label && (
        <span className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>
          {label}
        </span>
      )}
    </div>
  );
}
