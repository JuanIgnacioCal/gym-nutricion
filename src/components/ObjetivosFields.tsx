'use client';

export interface Objetivo {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  comidas: 3 | 4;
}

interface ObjetivosFieldsProps {
  valor: Objetivo;
  onChange: (o: Objetivo) => void;
}

type CampoKey = keyof Omit<Objetivo, 'comidas'>;

const CAMPOS: { key: CampoKey; label: string; min: number; max: number; unidad: string; def: number }[] = [
  { key: 'calorias', label: 'Calorías diarias', min: 1200, max: 5000, unidad: 'kcal', def: 2000 },
  { key: 'proteinas', label: 'Proteínas', min: 50, max: 300, unidad: 'g', def: 150 },
  { key: 'carbohidratos', label: 'Carbohidratos', min: 50, max: 500, unidad: 'g', def: 200 },
  { key: 'grasas', label: 'Grasas', min: 30, max: 200, unidad: 'g', def: 65 },
];

export default function ObjetivosFields({ valor, onChange }: ObjetivosFieldsProps) {
  const set = (key: keyof Objetivo, n: number) => onChange({ ...valor, [key]: n });

  // Calorías calculadas desde macros: prot×4 + carbs×4 + grasas×9
  const kcalCalculadas =
    valor.proteinas * 4 + valor.carbohidratos * 4 + valor.grasas * 9;
  const diff = kcalCalculadas - valor.calorias;
  const coincide = Math.abs(diff) <= 50;

  return (
    <div className="flex flex-col gap-4">
      {/* Selector de comidas */}
      <div>
        <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
          Número de comidas
        </span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([3, 4] as const).map((n) => {
            const activo = valor.comidas === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => set('comidas', n)}
                className="rounded-btn py-3 text-sm font-semibold transition-colors"
                style={{
                  background: activo ? 'var(--color-primario)' : 'var(--color-superficie-alt)',
                  color: activo ? 'var(--color-sobre-primario)' : 'var(--color-texto)',
                  border: `1px solid ${activo ? 'var(--color-primario)' : 'var(--color-borde)'}`,
                }}
              >
                {n} comidas
              </button>
            );
          })}
        </div>
      </div>

      {CAMPOS.map((c) => (
        <label key={c.key} className="block">
          <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
            {c.label} ({c.unidad})
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={c.min}
            max={c.max}
            // Campo vacío en vez de mostrar 0 mientras se edita.
            value={valor[c.key] === 0 ? '' : valor[c.key]}
            onChange={(e) => set(c.key, e.target.value === '' ? 0 : Number(e.target.value))}
            onBlur={(e) => {
              if (e.target.value === '' || Number(e.target.value) === 0) set(c.key, c.def);
            }}
            className="mt-1 w-full rounded-btn px-3 py-2.5 text-base outline-none"
            style={{
              background: 'var(--color-superficie-alt)',
              border: '1px solid var(--color-borde)',
              color: 'var(--color-texto)',
              textAlign: 'right',
            }}
          />
        </label>
      ))}

      <div
        className="rounded-btn px-3 py-2 text-sm"
        style={{ background: 'var(--color-superficie-alt)' }}
      >
        Calorías desde macros:{' '}
        <span style={{ color: coincide ? 'var(--color-exito)' : '#F97316', fontWeight: 600 }}>
          {Math.round(kcalCalculadas)} kcal
        </span>{' '}
        <span style={{ color: 'var(--color-texto-sec)' }}>
          {coincide
            ? '✓ coincide con tu objetivo'
            : `(${diff > 0 ? '+' : ''}${Math.round(diff)} vs objetivo)`}
        </span>
      </div>
    </div>
  );
}
