'use client';
import { useEffect } from 'react';
import { X, Heart, Clock, ExternalLink } from 'lucide-react';
import type { Receta } from '@/types';
import { esLocal, escalarIngrediente } from '@/lib/util';

interface RecipeDetailModalProps {
  receta: Receta | null;
  favorito?: boolean;
  onClose: () => void;
  onToggleFavorito?: (r: Receta) => void;
}

export default function RecipeDetailModal({
  receta,
  favorito = false,
  onClose,
  onToggleFavorito,
}: RecipeDetailModalProps) {
  // Cerrar con Escape y bloquear scroll de fondo mientras está abierto.
  useEffect(() => {
    if (!receta) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [receta, onClose]);

  if (!receta) return null;

  const macros = [
    { l: 'Calorías', v: `${receta.calorias}`, u: 'kcal' },
    { l: 'Proteínas', v: `${Math.round(receta.proteinas)}`, u: 'g' },
    { l: 'Carbohidratos', v: `${Math.round(receta.carbohidratos)}`, u: 'g' },
    { l: 'Grasas', v: `${Math.round(receta.grasas)}`, u: 'g' },
    { l: 'Fibra', v: `${Math.round(receta.fibra)}`, u: 'g' },
  ];

  // Factor de porción del plan: las cantidades y los macros ya vienen ajustados.
  const factorEscala =
    typeof receta.escala === 'number' && Number.isFinite(receta.escala) ? receta.escala : 1;
  const porcionAjustada = Math.abs(factorEscala - 1) > 0.01;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="animar-entrada w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-card sm:rounded-card"
        style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior y cerrar */}
        <div style={{ height: 4, background: 'var(--color-primario)' }} />
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold leading-tight">{receta.nombre}</h2>
              {receta.nombre_original && receta.nombre_original !== receta.nombre && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-texto-sec)' }}>
                  {receta.nombre_original}
                </p>
              )}
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="shrink-0 p-1">
              <X size={22} />
            </button>
          </div>

          {/* Meta: tiempos + origen */}
          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--color-texto-sec)' }}>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} /> Prep {receta.tiempo_preparacion || 0} min
            </span>
            <span className="inline-flex items-center gap-1">
              🔥 Cocción {receta.tiempo_coccion || 0} min
            </span>
            <span>· Total {receta.tiempo_total || 0} min</span>
            {esLocal(receta) && (
              <span
                className="px-2 py-0.5 rounded-full"
                style={{ background: 'var(--color-superficie-alt)' }}
              >
                🇦🇷 Receta local
              </span>
            )}
          </div>

          {/* Macros completos */}
          <div className="grid grid-cols-5 gap-2 text-center">
            {macros.map((m) => (
              <div
                key={m.l}
                className="rounded-btn py-2"
                style={{ background: 'var(--color-superficie-alt)' }}
              >
                <div className="font-bold text-sm" style={{ color: 'var(--color-acento)' }}>{m.v}</div>
                <div className="text-[10px]" style={{ color: 'var(--color-texto-sec)' }}>{m.u}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-texto-sec)' }}>{m.l}</div>
              </div>
            ))}
          </div>

          {porcionAjustada && (
            <p className="text-xs -mt-1" style={{ color: 'var(--color-texto-sec)' }}>
              Porción ajustada a tu objetivo:{' '}
              <strong style={{ color: 'var(--color-acento)' }}>×{factorEscala}</strong>. Las
              cantidades de los ingredientes y los macros ya están ajustados a tu porción.
            </p>
          )}

          {/* Ingredientes */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Ingredientes</h3>
            {receta.ingredientes.length > 0 ? (
              <ul className="space-y-1.5">
                {receta.ingredientes.map((ing, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span style={{ color: 'var(--color-primario)' }}>•</span>
                    <span>{escalarIngrediente(ing, factorEscala)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
                Sin ingredientes cargados.
              </p>
            )}
          </div>

          {/* Preparación */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Preparación</h3>
            {receta.pasos && receta.pasos.length > 0 ? (
              <ol className="space-y-2">
                {receta.pasos.map((paso, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span
                      className="shrink-0 inline-flex items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        width: 20,
                        height: 20,
                        background: 'var(--color-primario)',
                        color: 'var(--color-sobre-primario)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span>{paso}</span>
                  </li>
                ))}
              </ol>
            ) : receta.url_original ? (
              <a
                href={receta.url_original}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-btn px-4 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
              >
                <ExternalLink size={16} /> Ver receta completa
              </a>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
                Preparación básica: combinar los ingredientes indicados y cocinar según el método
                habitual para este plato.
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-1">
            {onToggleFavorito && (
              <button
                onClick={() => onToggleFavorito(receta)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-btn py-2.5 text-sm font-semibold"
                style={{ border: '1px solid var(--color-primario)', color: 'var(--color-texto)' }}
              >
                <Heart
                  size={16}
                  fill={favorito ? 'var(--color-primario)' : 'none'}
                  stroke="var(--color-primario)"
                />
                {favorito ? 'En favoritos' : 'Guardar en favoritos'}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-btn px-5 py-2.5 text-sm"
              style={{ border: '1px solid var(--color-borde)', color: 'var(--color-texto-sec)' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
