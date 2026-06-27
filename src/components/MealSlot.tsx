'use client';
import { useState } from 'react';
import { Heart, RotateCw, Clock, Info, Check } from 'lucide-react';
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
  onRegistrar?: (r: Receta) => void;
  consumido?: boolean;
}

export default function MealSlot({
  titulo,
  hora,
  receta,
  favorito = false,
  cargandoCambio = false,
  onFavorito,
  onCambiar,
  onRegistrar,
  consumido = false,
}: MealSlotProps) {
  const [detalle, setDetalle] = useState(false);
  return (
    <div
      className="animar-entrada flex flex-col gap-3"
      style={{ borderRadius: 24, background: 'var(--color-superficie)', border: '1px solid var(--color-borde)', padding: 18 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-extrabold tracking-wide" style={{ color: 'var(--color-primario)' }}>
          {titulo}
        </span>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--color-texto-3)' }}>
          {hora}
        </span>
      </div>

      {receta ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <button onClick={() => setDetalle(true)} className="min-w-0 text-left">
              <h3 className="text-[18px] font-extrabold leading-tight" style={{ letterSpacing: '-0.4px' }}>
                {receta.nombre}
              </h3>
            </button>
            <button
              onClick={() => setDetalle(true)}
              aria-label="Ver receta"
              className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full"
              style={{ border: '1.5px solid var(--color-primario)', color: 'var(--color-primario)', background: 'transparent' }}
            >
              <Info size={16} />
            </button>
          </div>

          {typeof receta.escala === 'number' && Math.abs(receta.escala - 1) > 0.01 && (
            <span
              className="self-start px-2.5 py-1 text-xs font-bold"
              style={{ borderRadius: 9, background: 'var(--color-superficie-alt)', color: 'var(--color-texto-soft)' }}
            >
              Porción ×{receta.escala}
            </span>
          )}

          <MacroChips
            calorias={receta.calorias}
            proteinas={receta.proteinas}
            carbohidratos={receta.carbohidratos}
            grasas={receta.grasas}
          />

          <div className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: 'var(--color-texto-3)' }}>
            <Clock size={13} /> {receta.tiempo_total || receta.tiempo_preparacion || 0} min
          </div>

          {onRegistrar &&
            (consumido ? (
              <button
                onClick={() => onRegistrar(receta)}
                className="glass flex h-12 items-center justify-center gap-2 text-[15px] font-extrabold"
                style={{ borderRadius: 14, color: 'var(--color-texto-sec)' }}
              >
                <Check size={17} strokeWidth={3} /> Consumido
              </button>
            ) : (
              <button
                onClick={() => onRegistrar(receta)}
                className="btn-dorado flex h-12 items-center justify-center gap-2 text-[15px] font-extrabold"
                style={{ borderRadius: 14 }}
              >
                <Check size={17} strokeWidth={3} /> Comí esto
              </button>
            ))}

          <div className="flex gap-2.5">
            {onFavorito && (
              <button
                onClick={() => onFavorito(receta)}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 text-[13px] font-bold"
                style={{ borderRadius: 13, border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
              >
                <Heart
                  size={16}
                  fill={favorito ? 'var(--color-primario)' : 'none'}
                  stroke="var(--color-primario)"
                />
                Favorito
              </button>
            )}
            <button
              onClick={onCambiar}
              disabled={cargandoCambio}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 text-[13px] font-bold disabled:opacity-60"
              style={{ borderRadius: 13, border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
            >
              <RotateCw size={15} className={cargandoCambio ? 'animate-spin' : ''} />
              Cambiar
            </button>
          </div>
        </>
      ) : (
        <p className="py-4 text-center text-sm" style={{ color: 'var(--color-texto-sec)' }}>
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
