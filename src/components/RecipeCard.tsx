'use client';
import { useState } from 'react';
import { Heart, Plus, Clock, Info } from 'lucide-react';
import type { Receta } from '@/types';
import { esLocal } from '@/lib/util';
import MacroChips from './MacroChips';
import RecipeDetailModal from './RecipeDetailModal';

interface RecipeCardProps {
  receta: Receta;
  favorito?: boolean;
  onToggleFavorito?: (r: Receta) => void;
  onAgregar?: (r: Receta) => void;
  /** Reservado por compatibilidad; el detalle ahora se abre como modal al tocar la card. */
  expandible?: boolean;
}

export default function RecipeCard({
  receta,
  favorito = false,
  onToggleFavorito,
  onAgregar,
}: RecipeCardProps) {
  const [detalle, setDetalle] = useState(false);
  const local = esLocal(receta);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetalle(true)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setDetalle(true)}
        className="rounded-card overflow-hidden animar-entrada cursor-pointer text-left"
        style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
      >
        <div style={{ height: 4, background: 'var(--gradiente-dorado)' }} />
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-extrabold leading-tight">{receta.nombre}</h3>
            {onToggleFavorito && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorito(receta);
                }}
                aria-label="Favorito"
                className="shrink-0"
              >
                <Heart
                  size={20}
                  fill={favorito ? 'var(--color-primario)' : 'none'}
                  stroke="var(--color-primario)"
                />
              </button>
            )}
          </div>

          <MacroChips
            calorias={receta.calorias}
            proteinas={receta.proteinas}
            carbohidratos={receta.carbohidratos}
            grasas={receta.grasas}
          />

          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-texto-sec)' }}>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} /> {receta.tiempo_total || receta.tiempo_preparacion || 0} min
            </span>
            {local && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: 'var(--color-superficie-alt)' }}
              >
                🇦🇷 Receta local
              </span>
            )}
            <span className="inline-flex items-center gap-1 ml-auto" style={{ color: 'var(--color-primario)' }}>
              <Info size={13} /> Ver receta
            </span>
          </div>

          {onAgregar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAgregar(receta);
              }}
              className="btn-dorado inline-flex items-center justify-center gap-1 py-2.5 text-sm font-extrabold"
              style={{ borderRadius: 13 }}
            >
              <Plus size={16} /> Agregar
            </button>
          )}
        </div>
      </div>

      {detalle && (
        <RecipeDetailModal
          receta={receta}
          favorito={favorito}
          onClose={() => setDetalle(false)}
          onToggleFavorito={onToggleFavorito}
        />
      )}
    </>
  );
}
