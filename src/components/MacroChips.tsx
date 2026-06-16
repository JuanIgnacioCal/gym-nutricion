'use client';

interface MacroChipsProps {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  size?: 'sm' | 'md';
}

/** Fila de chips de macros reutilizable: 🔥 kcal · 🥩 prot · 🌾 carbs · 💧 grasas */
export default function MacroChips({
  calorias,
  proteinas,
  carbohidratos,
  grasas,
  size = 'md',
}: MacroChipsProps) {
  const chips = [
    { icon: '🔥', valor: `${Math.round(calorias)} kcal` },
    { icon: '🥩', valor: `${Math.round(proteinas)}g prot` },
    { icon: '🌾', valor: `${Math.round(carbohidratos)}g carbs` },
    { icon: '💧', valor: `${Math.round(grasas)}g grasas` },
  ];
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.valor}
          className={`inline-flex items-center gap-1 rounded-full ${pad}`}
          style={{
            background: 'transparent',
            color: 'var(--color-texto)',
            border: '1px solid var(--color-primario)',
          }}
        >
          <span>{c.icon}</span>
          <span>{c.valor}</span>
        </span>
      ))}
    </div>
  );
}
