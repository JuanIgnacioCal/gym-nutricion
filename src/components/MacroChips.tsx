'use client';

interface MacroChipsProps {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  size?: 'sm' | 'md';
}

// Colores de macro (semánticos, fijos): kcal sigue la marca; el resto son fijos del sistema.
const DOTS = {
  kcal: 'var(--color-primario)',
  prot: '#FF6B5E',
  carbs: '#E0A93B',
  gras: '#5AA9E6',
};

/** Badges de macros estilo prototipo: dot de color + valor, sobre superficie tenue. */
export default function MacroChips({
  calorias,
  proteinas,
  carbohidratos,
  grasas,
  size = 'md',
}: MacroChipsProps) {
  const items = [
    { dot: DOTS.kcal, valor: `${Math.round(calorias)} kcal` },
    { dot: DOTS.prot, valor: `${Math.round(proteinas)}g prot` },
    { dot: DOTS.carbs, valor: `${Math.round(carbohidratos)}g carbs` },
    { dot: DOTS.gras, valor: `${Math.round(grasas)}g grasas` },
  ];
  const pad = size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs';

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((c) => (
        <span
          key={c.valor}
          className={`inline-flex items-center gap-1.5 font-bold ${pad}`}
          style={{ borderRadius: 10, background: 'var(--color-superficie-alt)', color: 'var(--color-texto)' }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 2, background: c.dot, flex: 'none' }} />
          {c.valor}
        </span>
      ))}
    </div>
  );
}
