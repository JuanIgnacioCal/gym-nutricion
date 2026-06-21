'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { Receta, TipoComida, UserProfile, AlimentoBusqueda } from '@/types';
import { getUserAsync, aplicarTema } from '@/lib/usuario';
import { fechaHoy, slotsDe, labelSlot } from '@/lib/util';
import BottomNav from '@/components/BottomNav';
import RecipeCard from '@/components/RecipeCard';
import FoodSearchResult from '@/components/FoodSearchResult';
import { useToast } from '@/components/Toast';

export default function BuscarPage() {
  const router = useRouter();
  const { toast, mostrar } = useToast();

  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [query, setQuery] = useState('');
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [alimentos, setAlimentos] = useState<AlimentoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [hizoBusqueda, setHizoBusqueda] = useState(false);
  const [mealRecetas, setMealRecetas] = useState<TipoComida>('almuerzo');

  const fecha = fechaHoy();

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
    })();
    return () => {
      cancelado = true;
    };
  }, [router]);

  const buscar = async () => {
    if (!query.trim()) return;
    setBuscando(true);
    setHizoBusqueda(true);
    try {
      // 1) recetas propias (local) · 2) + 3) USDA / Open Food Facts (en /api/buscar)
      const [recRes, aliRes] = await Promise.all([
        fetch(`/api/recetas?buscar=${encodeURIComponent(query)}&limite=10`),
        fetch(`/api/buscar?query=${encodeURIComponent(query)}`),
      ]);
      setRecetas(await recRes.json());
      setAlimentos(await aliRes.json());
    } finally {
      setBuscando(false);
    }
  };

  const registrarAlimento = (a: AlimentoBusqueda, gramos: number, tipo: TipoComida) => {
    if (!perfil) return;
    const f = gramos / 100;
    fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: perfil.id,
        fecha,
        tipo_comida: tipo,
        nombre_comida: `${a.nombre} (${gramos}g)`,
        calorias: Math.round(a.calorias * f),
        proteinas: +(a.proteinas * f).toFixed(1),
        carbohidratos: +(a.carbohidratos * f).toFixed(1),
        grasas: +(a.grasas * f).toFixed(1),
        fibra: +((a.fibra ?? 0) * f).toFixed(1),
        gramos,
      }),
    }).then(() => mostrar(`✅ Registrado en ${labelSlot(tipo)}`));
  };

  const guardarAlimento = async (a: AlimentoBusqueda) => {
    if (!perfil) return;
    await fetch('/api/favoritos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: perfil.id, tipo: 'personalizado', comida_personalizada: a }),
    });
    mostrar('♥ Guardado en favoritos');
  };

  const agregarReceta = async (r: Receta) => {
    if (!perfil) return;
    await fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: perfil.id,
        fecha,
        tipo_comida: mealRecetas,
        receta_id: r.id,
        nombre_comida: r.nombre,
        calorias: r.calorias,
        proteinas: r.proteinas,
        carbohidratos: r.carbohidratos,
        grasas: r.grasas,
        fibra: r.fibra,
        gramos: 0,
      }),
    });
    mostrar(`✅ ${r.nombre} → ${labelSlot(mealRecetas)}`);
  };

  const guardarReceta = async (r: Receta) => {
    if (!perfil) return;
    await fetch('/api/favoritos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: perfil.id, tipo: 'receta', receta_id: r.id }),
    });
    mostrar('♥ Receta guardada');
  };

  const slots = perfil ? slotsDe(perfil.objetivo.comidas) : [];
  const tipos = slots.map((s) => ({ value: s.value, label: s.label }));

  return (
    <main className="min-h-screen px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 22px)' }}>
      <h1 className="mb-4 text-[27px] font-extrabold" style={{ letterSpacing: '-0.7px' }}>Buscar alimento</h1>

      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && buscar()}
          placeholder="Buscar alimento... ej: arroz, pechuga, manzana"
          className="w-full outline-none"
          style={{ height: 52, borderRadius: 16, padding: '0 16px', fontSize: 15, fontWeight: 500, background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
        />
        <button
          onClick={buscar}
          className="btn-dorado inline-flex shrink-0 items-center justify-center px-4"
          style={{ borderRadius: 14 }}
        >
          <Search size={20} />
        </button>
      </div>

      {buscando && <Spinner />}

      {!buscando && hizoBusqueda && (
        <div className="flex flex-col gap-5">
          {/* Recetas propias */}
          {recetas.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-texto-sec)' }}>
                  Recetas ({recetas.length})
                </h2>
                <select
                  value={mealRecetas}
                  onChange={(e) => setMealRecetas(e.target.value as TipoComida)}
                  className="rounded-btn px-2 py-1 text-xs outline-none"
                  style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
                >
                  {tipos.map((t) => (
                    <option key={t.value} value={t.value}>Agregar a {t.label}</option>
                  ))}
                </select>
              </div>
              {recetas.map((r) => (
                <RecipeCard
                  key={r.id}
                  receta={r}
                  onToggleFavorito={guardarReceta}
                  onAgregar={agregarReceta}
                  expandible
                />
              ))}
            </section>
          )}

          {/* Alimentos externos */}
          {alimentos.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-texto-sec)' }}>
                Alimentos ({alimentos.length})
              </h2>
              {alimentos.map((a) => (
                <FoodSearchResult
                  key={a.id}
                  alimento={a}
                  tipos={tipos}
                  onRegistrar={registrarAlimento}
                  onGuardar={guardarAlimento}
                />
              ))}
            </section>
          )}

          {recetas.length === 0 && alimentos.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--color-texto-sec)' }}>
              Sin resultados para “{query}”. Probá otro término.
            </p>
          )}
        </div>
      )}

      {!hizoBusqueda && (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--color-texto-sec)' }}>
          Escribí un alimento y tocá buscar. Para productos argentinos probá con acentos
          (ej: “mate”, “dulce de leche”).
        </p>
      )}

      <BottomNav />
      {toast}
    </main>
  );
}

function Spinner() {
  return (
    <div className="py-10 flex justify-center">
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--color-primario)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
