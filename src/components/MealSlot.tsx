'use client';
import { useState } from 'react';
import { Heart, RotateCw, Clock, Info } from 'lucide-react';
import type { Receta } from '@/types';
import MacroChips from './MacroChips';
import RecipeDetailModal from './RecipeDetailModal';

interface MealSlotProps {
  titulo: string;
  hora: string;
  receta?: Receta;
  favorito?: boolean;
  cargandoCambio?: boolean;
  onFavorito?: (r: Receta) => void;
  onCambiar?: () => void;
}

export default function MealSlot({
  titulo,
  hora,
  receta,
  favorito = false,
  cargandoCambio = false,
  onFavorito,
  onCambiar,
}: MealSlotProps) {
  const [detalle, setDetalle] = useState(false);
  return (
    <div
      className="rounded-card p-4 flex flex-col gap-3 animar-entrada"
      style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold" style={{ color: 'var(--color-primario)' }}>
          {titulo}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>
          {hora}
        </span>
      </div>

      {receta ? (
        <>
          <button
            onClick={() => setDetalle(true)}
            className="text-left flex items-center justify-between gap-2"
          >
            <h3 className="text-lg font-bold leading-tight">{receta.nombre}</h3>
            <Info size={16} className="shrink-0" style={{ color: 'var(--color-primario)' }} />
          </button>
          <MacroChips
            calorias={receta.calorias}
            proteinas={receta.proteinas}
            carbohidratos={receta.carbohidratos}
            grasas={receta.grasas}
          />
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-texto-sec)' }}>
            <Clock size={13} /> {receta.tiempo_total || receta.tiempo_preparacion || 0} min
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onFavorito?.(receta)}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-btn py-2 text-sm"
              style={{ border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
            >
              <Heart
                size={15}
                fill={favorito ? 'var(--color-primario)' : 'none'}
                stroke="var(--color-primario)"
              />
              Favorito
            </button>
            <button
              onClick={onCambiar}
              disabled={cargandoCambio}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-btn py-2 text-sm disabled:opacity-60"
              style={{ border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
            >
              <RotateCw size={15} className={cargandoCambio ? 'animate-spin' : ''} />
              Cambiar
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--color-texto-sec)' }}>
          Sin receta asignada
        </p>
      )}

      {detalle && receta && (
        <RecipeDetailModal
          receta={receta}
          favorito={favorito}
          onClose={() => setDetalle(false)}
          onToggleFavorito={onFavorito}
        />
      )}
    </div>
  );
}
