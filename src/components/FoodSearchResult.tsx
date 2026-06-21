'use client';
import { useMemo, useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import type { AlimentoBusqueda, TipoComida } from '@/types';
import { escalarPorGramos } from '@/lib/util';

interface FoodSearchResultProps {
  alimento: AlimentoBusqueda;
  tipos: { value: TipoComida; label: string }[];
  onRegistrar: (alimento: AlimentoBusqueda, gramos: number, tipo: TipoComida) => void;
  onGuardar?: (alimento: AlimentoBusqueda, gramos: number) => void;
}

export default function FoodSearchResult({
  alimento,
  tipos,
  onRegistrar,
  onGuardar,
}: FoodSearchResultProps) {
  const [gramos, setGramos] = useState(100);
  const [tipo, setTipo] = useState<TipoComida>(tipos[0]?.value ?? 'almuerzo');

  const calc = useMemo(() => escalarPorGramos(alimento, gramos || 0), [alimento, gramos]);

  const fuenteBadge =
    alimento.fuente === 'usda' ? 'USDA' : alimento.fuente === 'openfoodfacts' ? 'OFF' : 'Receta';

  return (
    <div
      className="rounded-card p-4 flex flex-col gap-3 animar-entrada"
      style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-extrabold leading-tight">{alimento.nombre}</h3>
        <span
          className="shrink-0 text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: 'var(--color-superficie-alt)', color: 'var(--color-texto-sec)' }}
        >
          {fuenteBadge}
        </span>
      </div>

      {/* Tabla de macros por 100g */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {[
          { l: 'kcal', v: Math.round(alimento.calorias) },
          { l: 'prot', v: `${Math.round(alimento.proteinas)}g` },
          { l: 'carbs', v: `${Math.round(alimento.carbohidratos)}g` },
          { l: 'grasas', v: `${Math.round(alimento.grasas)}g` },
        ].map((m) => (
          <div
            key={m.l}
            className="rounded-btn py-1.5"
            style={{ background: 'var(--color-superficie-alt)' }}
          >
            <div className="font-bold" style={{ color: 'var(--color-acento)' }}>{m.v}</div>
            <div style={{ color: 'var(--color-texto-sec)' }}>{m.l}/100g</div>
          </div>
        ))}
      </div>

      {/* Cantidad y macros calculados */}
      <div className="flex items-end gap-3">
        <label className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>
          Gramos
          <input
            type="number"
            min={1}
            value={gramos}
            onChange={(e) => setGramos(Math.max(0, Number(e.target.value)))}
            className="mt-1 w-24 rounded-btn px-3 py-2 text-base outline-none"
            style={{
              background: 'var(--color-superficie-alt)',
              border: '1px solid var(--color-borde)',
              color: 'var(--color-texto)',
            }}
          />
        </label>
        <div className="flex-1 text-xs" style={{ color: 'var(--color-texto-sec)' }}>
          Para {gramos || 0}g:{' '}
          <span style={{ color: 'var(--color-acento)' }}>
            {calc.calorias} kcal · {calc.proteinas}g P · {calc.carbohidratos}g C · {calc.grasas}g G
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoComida)}
          className="rounded-btn px-2 py-2 text-sm outline-none"
          style={{
            background: 'var(--color-superficie-alt)',
            border: '1px solid var(--color-borde)',
            color: 'var(--color-texto)',
          }}
        >
          {tipos.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          onClick={() => onRegistrar(alimento, gramos || 0, tipo)}
          className="btn-dorado inline-flex flex-1 items-center justify-center gap-1 py-2.5 text-sm font-extrabold"
          style={{ borderRadius: 13 }}
        >
          <Plus size={16} /> Registrar
        </button>
        {onGuardar && (
          <button
            onClick={() => onGuardar(alimento, gramos || 0)}
            aria-label="Guardar en favoritos"
            className="inline-flex items-center justify-center rounded-btn px-3"
            style={{ border: '1px solid var(--color-borde)' }}
          >
            <Heart size={16} stroke="var(--color-primario)" />
          </button>
        )}
      </div>
    </div>
  );
}
