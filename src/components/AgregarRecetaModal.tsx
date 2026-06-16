'use client';
import { useState } from 'react';
import { X, Search, Plus, Trash2 } from 'lucide-react';
import type { AlimentoBusqueda, Receta, TipoComida } from '@/types';
import { escalarPorGramos, sumarMacros } from '@/lib/util';

interface IngredienteReceta {
  nombre: string;
  gramos: number;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  fibra: number;
}

interface AgregarRecetaModalProps {
  onClose: () => void;
  onGuardada: (r: Receta) => void;
}

const TIPOS: { value: TipoComida; label: string }[] = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'merienda', label: 'Merienda' },
  { value: 'cena', label: 'Cena' },
];

export default function AgregarRecetaModal({ onClose, onGuardada }: AgregarRecetaModalProps) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoComida>('almuerzo');
  const [prep, setPrep] = useState(15);
  const [ingredientes, setIngredientes] = useState<IngredienteReceta[]>([]);

  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<AlimentoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const total = sumarMacros(ingredientes);
  const fibraTotal = ingredientes.reduce((s, i) => s + i.fibra, 0);

  const buscar = async () => {
    if (!query.trim()) return;
    setBuscando(true);
    try {
      const res = await fetch(`/api/buscar?query=${encodeURIComponent(query)}`);
      setResultados(await res.json());
    } finally {
      setBuscando(false);
    }
  };

  const agregarIngrediente = (a: AlimentoBusqueda, gramos: number) => {
    const c = escalarPorGramos(a, gramos);
    setIngredientes((prev) => [...prev, { nombre: `${a.nombre} (${gramos}g)`, gramos, ...c }]);
  };

  const quitarIngrediente = (i: number) =>
    setIngredientes((prev) => prev.filter((_, idx) => idx !== i));

  const guardar = async () => {
    setError('');
    if (!nombre.trim()) return setError('Poné un nombre a la receta.');
    if (ingredientes.length === 0) return setError('Agregá al menos un ingrediente.');
    setGuardando(true);
    try {
      const res = await fetch('/api/recetas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          tipo_comida: tipo,
          tiempo_preparacion: prep,
          calorias: total.calorias,
          proteinas: total.proteinas,
          carbohidratos: total.carbohidratos,
          grasas: total.grasas,
          fibra: fibraTotal,
          ingredientes: ingredientes.map((i) => i.nombre),
        }),
      });
      if (!res.ok) throw new Error('No se pudo guardar');
      const receta: Receta = await res.json();
      onGuardada(receta);
    } catch {
      setError('Hubo un problema al guardar. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="animar-entrada w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-card sm:rounded-card"
        style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-4"
          style={{ background: 'var(--color-superficie)', borderBottom: '1px solid var(--color-borde)' }}>
          <h2 className="text-lg font-bold">Agregar mi receta</h2>
          <button onClick={onClose} aria-label="Cerrar"><X size={22} /></button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Nombre */}
          <label className="block">
            <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>Nombre de la receta</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Bowl de pollo y arroz"
              className="mt-1 w-full rounded-btn px-3 py-2.5 outline-none"
              style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
            />
          </label>

          {/* Buscar ingrediente */}
          <div>
            <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>Agregar ingredientes</span>
            <div className="mt-1 flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
                placeholder="Ej: arroz, pollo, banana..."
                className="w-full rounded-btn px-3 py-2.5 outline-none"
                style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
              />
              <button
                onClick={buscar}
                className="shrink-0 inline-flex items-center justify-center rounded-btn px-4"
                style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
              >
                <Search size={18} />
              </button>
            </div>

            {buscando && (
              <div className="py-4 flex justify-center">
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-primario)', borderTopColor: 'transparent' }} />
              </div>
            )}
            {!buscando && resultados.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                {resultados.map((a) => (
                  <ResultadoIngrediente key={a.id} alimento={a} onAgregar={agregarIngrediente} />
                ))}
              </div>
            )}
          </div>

          {/* Lista de ingredientes agregados */}
          {ingredientes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Ingredientes ({ingredientes.length})</span>
              {ingredientes.map((ing, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-btn px-3 py-2"
                  style={{ background: 'var(--color-superficie-alt)' }}>
                  <span className="text-sm min-w-0 truncate">{ing.nombre}</span>
                  <span className="text-xs shrink-0" style={{ color: 'var(--color-texto-sec)' }}>
                    {ing.calorias} kcal
                  </span>
                  <button onClick={() => quitarIngrediente(i)} aria-label="Quitar" className="shrink-0">
                    <Trash2 size={15} style={{ color: 'var(--color-error)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Suma de macros en vivo */}
          <div className="grid grid-cols-4 gap-2 text-center rounded-card p-3"
            style={{ background: 'var(--color-superficie-alt)' }}>
            {[
              { l: 'kcal', v: total.calorias },
              { l: 'prot', v: `${Math.round(total.proteinas)}g` },
              { l: 'carbs', v: `${Math.round(total.carbohidratos)}g` },
              { l: 'grasas', v: `${Math.round(total.grasas)}g` },
            ].map((m) => (
              <div key={m.l}>
                <div className="font-bold" style={{ color: 'var(--color-acento)' }}>{m.v}</div>
                <div className="text-[10px]" style={{ color: 'var(--color-texto-sec)' }}>{m.l}</div>
              </div>
            ))}
          </div>

          {/* Tiempo + tipo */}
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>Prep (min)</span>
              <input
                type="number" inputMode="numeric" min={0}
                value={prep === 0 ? '' : prep}
                onChange={(e) => setPrep(e.target.value === '' ? 0 : Number(e.target.value))}
                className="mt-1 w-full rounded-btn px-3 py-2.5 outline-none"
                style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)', textAlign: 'right' }}
              />
            </label>
            <label className="flex-1">
              <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>Tipo de comida</span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoComida)}
                className="mt-1 w-full rounded-btn px-3 py-2.5 outline-none"
                style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
              >
                {TIPOS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
              </select>
            </label>
          </div>

          {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

          <button
            onClick={guardar}
            disabled={guardando}
            className="rounded-btn py-3 text-base font-semibold disabled:opacity-60"
            style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
          >
            {guardando ? 'Guardando...' : 'Guardar receta'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultadoIngrediente({
  alimento,
  onAgregar,
}: {
  alimento: AlimentoBusqueda;
  onAgregar: (a: AlimentoBusqueda, gramos: number) => void;
}) {
  const [gramos, setGramos] = useState(100);
  const c = escalarPorGramos(alimento, gramos || 0);
  return (
    <div className="flex items-center gap-2 rounded-btn px-3 py-2"
      style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)' }}>
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate">{alimento.nombre}</p>
        <p className="text-[11px]" style={{ color: 'var(--color-texto-sec)' }}>
          {c.calorias} kcal · {c.proteinas}g P para {gramos || 0}g
        </p>
      </div>
      <input
        type="number" inputMode="numeric" min={1} value={gramos}
        onChange={(e) => setGramos(Math.max(0, Number(e.target.value)))}
        className="w-16 rounded-btn px-2 py-1.5 text-sm outline-none"
        style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)', textAlign: 'right' }}
      />
      <button
        onClick={() => onAgregar(alimento, gramos || 0)}
        aria-label="Agregar ingrediente"
        className="shrink-0 inline-flex items-center justify-center rounded-btn p-2"
        style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
