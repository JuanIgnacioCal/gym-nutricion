'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Clock, Plus } from 'lucide-react';
import type { Receta, TipoComida, UserProfile, AlimentoBusqueda } from '@/types';
import { getUserAsync, aplicarTema } from '@/lib/usuario';
import { fechaHoy, slotsDe, labelSlot, escalarPorGramos } from '@/lib/util';
import BottomNav from '@/components/BottomNav';
import MacroChips from '@/components/MacroChips';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import { useToast } from '@/components/Toast';

interface FavReceta {
  id: number;
  tipo: 'receta';
  receta: Receta | null;
}
interface FavAlimento {
  id: number;
  tipo: 'personalizado';
  comida: AlimentoBusqueda | null;
}

export default function FavoritosPage() {
  const router = useRouter();
  const { toast, mostrar } = useToast();

  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [favRecetas, setFavRecetas] = useState<FavReceta[]>([]);
  const [favAlimentos, setFavAlimentos] = useState<FavAlimento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [detalle, setDetalle] = useState<Receta | null>(null);

  const fecha = fechaHoy();

  const cargar = useCallback(async (u: UserProfile) => {
    setCargando(true);
    try {
      const [rRes, aRes] = await Promise.all([
        fetch(`/api/favoritos?usuario_id=${u.id}&tipo=receta`),
        fetch(`/api/favoritos?usuario_id=${u.id}&tipo=personalizado`),
      ]);
      setFavRecetas(await rRes.json());
      setFavAlimentos(await aRes.json());
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const u = await getUserAsync();
      if (cancelado) return;
      if (!u || u.onboardingCompleto === false) {
        router.replace('/onboarding');
        return;
      }
      aplicarTema(u.tema);
      setPerfil(u);
      cargar(u);
    })();
    return () => {
      cancelado = true;
    };
  }, [router, cargar]);

  const quitar = async (id: number) => {
    await fetch(`/api/favoritos?id=${id}`, { method: 'DELETE' });
    if (perfil) cargar(perfil);
  };

  const agregarAlPlan = async (r: Receta, slot: TipoComida) => {
    if (!perfil) return;
    await fetch('/api/plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: perfil.id, fecha, slot, receta_id: r.id }),
    });
    mostrar(`✅ ${r.nombre} → ${labelSlot(slot)} del plan`);
  };

  const registrarAlimento = (a: AlimentoBusqueda, gramos: number, tipo: TipoComida) => {
    if (!perfil) return;
    const c = escalarPorGramos(a, gramos);
    fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: perfil.id,
        fecha,
        tipo_comida: tipo,
        nombre_comida: `${a.nombre} (${gramos}g)`,
        ...c,
        gramos,
      }),
    }).then(() => mostrar(`✅ Registrado en ${labelSlot(tipo)}`));
  };

  if (!perfil) return <Spinner />;

  const slots = slotsDe(perfil.objetivo.comidas);
  const tipos = slots.map((s) => ({ value: s.value, label: s.label }));
  const vacio = !cargando && favRecetas.length === 0 && favAlimentos.length === 0;

  return (
    <main className="min-h-screen px-4 pt-6">
      <h1 className="text-xl font-bold mb-4">Favoritos</h1>

      {cargando && <Spinner inline />}

      {vacio && (
        <div className="py-16 text-center">
          <p style={{ color: 'var(--color-texto-sec)' }}>
            Aún no tenés favoritos. Marcá recetas con ♡ desde el plan del día.
          </p>
        </div>
      )}

      {/* Recetas favoritas */}
      {favRecetas.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-texto-sec)' }}>
            Recetas favoritas
          </h2>
          <div className="flex flex-col gap-2">
            {favRecetas.map((f) =>
              f.receta ? (
                <div
                  key={f.id}
                  className="rounded-card p-4 flex flex-col gap-3"
                  style={{
                    background: 'var(--color-superficie)',
                    border: '1px solid var(--color-borde)',
                    borderLeft: '3px solid var(--color-primario)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => setDetalle(f.receta)}
                      className="text-left font-bold leading-tight"
                    >
                      {f.receta.nombre}
                    </button>
                    <button onClick={() => quitar(f.id)} aria-label="Quitar" className="shrink-0">
                      <X size={18} style={{ color: 'var(--color-texto-sec)' }} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-texto-sec)' }}>
                    <span>🔥 {f.receta.calorias} kcal</span>
                    <span>🥩 {Math.round(f.receta.proteinas)}g prot</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} /> {f.receta.tiempo_total || 0} min
                    </span>
                  </div>
                  <AgregarAlPlan tipos={tipos} onAgregar={(slot) => agregarAlPlan(f.receta!, slot)} />
                </div>
              ) : null
            )}
          </div>
        </section>
      )}

      {/* Alimentos guardados */}
      {favAlimentos.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-texto-sec)' }}>
            Alimentos guardados
          </h2>
          <div className="flex flex-col gap-2">
            {favAlimentos.map((f) =>
              f.comida ? (
                <div
                  key={f.id}
                  className="rounded-card p-4 flex flex-col gap-3"
                  style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{f.comida.nombre}</h3>
                    <button onClick={() => quitar(f.id)} aria-label="Quitar" className="shrink-0">
                      <X size={18} style={{ color: 'var(--color-texto-sec)' }} />
                    </button>
                  </div>
                  <MacroChips
                    calorias={f.comida.calorias}
                    proteinas={f.comida.proteinas}
                    carbohidratos={f.comida.carbohidratos}
                    grasas={f.comida.grasas}
                    size="sm"
                  />
                  <p className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>valores por 100g</p>
                  <RegistrarAlimento
                    tipos={tipos}
                    onRegistrar={(gramos, tipo) => registrarAlimento(f.comida!, gramos, tipo)}
                  />
                </div>
              ) : null
            )}
          </div>
        </section>
      )}

      <RecipeDetailModal
        receta={detalle}
        onClose={() => setDetalle(null)}
        onToggleFavorito={(r) => {
          const fav = favRecetas.find((f) => f.receta?.id === r.id);
          if (fav) quitar(fav.id);
          setDetalle(null);
        }}
      />

      <BottomNav />
      {toast}
    </main>
  );
}

function AgregarAlPlan({
  tipos,
  onAgregar,
}: {
  tipos: { value: TipoComida; label: string }[];
  onAgregar: (slot: TipoComida) => void;
}) {
  const [slot, setSlot] = useState<TipoComida>(tipos[0]?.value ?? 'almuerzo');
  return (
    <div className="flex gap-2">
      <select
        value={slot}
        onChange={(e) => setSlot(e.target.value as TipoComida)}
        className="rounded-btn px-2 py-2 text-sm outline-none"
        style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
      >
        {tipos.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <button
        onClick={() => onAgregar(slot)}
        className="flex-1 inline-flex items-center justify-center gap-1 rounded-btn py-2 text-sm font-semibold"
        style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
      >
        <Plus size={15} /> Agregar al plan
      </button>
    </div>
  );
}

function RegistrarAlimento({
  tipos,
  onRegistrar,
}: {
  tipos: { value: TipoComida; label: string }[];
  onRegistrar: (gramos: number, tipo: TipoComida) => void;
}) {
  const [gramos, setGramos] = useState(100);
  const [tipo, setTipo] = useState<TipoComida>(tipos[0]?.value ?? 'almuerzo');
  return (
    <div className="flex gap-2 items-center">
      <input
        type="number"
        min={1}
        value={gramos}
        onChange={(e) => setGramos(Math.max(0, Number(e.target.value)))}
        className="w-20 rounded-btn px-2 py-2 text-sm outline-none"
        style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
      />
      <select
        value={tipo}
        onChange={(e) => setTipo(e.target.value as TipoComida)}
        className="rounded-btn px-2 py-2 text-sm outline-none"
        style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
      >
        {tipos.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <button
        onClick={() => onRegistrar(gramos, tipo)}
        className="flex-1 inline-flex items-center justify-center gap-1 rounded-btn py-2 text-sm font-semibold"
        style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
      >
        Registrar
      </button>
    </div>
  );
}

function Spinner({ inline }: { inline?: boolean }) {
  return (
    <div className={inline ? 'py-10 flex justify-center' : 'flex items-center justify-center h-screen'}>
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--color-primario)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
