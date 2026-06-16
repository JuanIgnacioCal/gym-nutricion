'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { Receta, UserProfile } from '@/types';
import { getUser, aplicarTema } from '@/lib/usuario';
import BottomNav from '@/components/BottomNav';
import RecipeCard from '@/components/RecipeCard';
import { useToast } from '@/components/Toast';

type FiltroId = 'todas' | 'alta_proteina' | 'bajo_carb' | 'vegetariano' | 'desayuno' | 'rapidas';

const FILTROS: { id: FiltroId; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'alta_proteina', label: 'Alta proteína' },
  { id: 'bajo_carb', label: 'Bajo carb' },
  { id: 'vegetariano', label: 'Vegetariano' },
  { id: 'desayuno', label: 'Desayuno' },
  { id: 'rapidas', label: 'Rápidas (< 20 min)' },
];

export default function RecetasPage() {
  const router = useRouter();
  const { toast, mostrar } = useToast();

  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [filtro, setFiltro] = useState<FiltroId>('todas');
  const [query, setQuery] = useState('');
  const [favMap, setFavMap] = useState<Record<number, number>>({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u || !u.onboardingCompleto) {
      router.replace('/onboarding');
      return;
    }
    aplicarTema(u.tema);
    setPerfil(u);

    (async () => {
      const [recRes, favRes] = await Promise.all([
        fetch('/api/recetas?limite=200'),
        fetch(`/api/favoritos?usuario_id=${u.id}&tipo=receta`),
      ]);
      setRecetas(await recRes.json());
      const favs = await favRes.json();
      const map: Record<number, number> = {};
      if (Array.isArray(favs)) for (const f of favs) if (f.receta?.id) map[f.receta.id] = f.id;
      setFavMap(map);
      setCargando(false);
    })();
  }, [router]);

  const visibles = useMemo(() => {
    return recetas.filter((r) => {
      if (query && !r.nombre.toLowerCase().includes(query.toLowerCase())) return false;
      switch (filtro) {
        case 'alta_proteina':
        case 'bajo_carb':
        case 'vegetariano':
          return r.categoria?.includes(filtro);
        case 'desayuno':
          return r.tipo_comida?.includes('desayuno');
        case 'rapidas':
          return (r.tiempo_total || 0) > 0 && r.tiempo_total < 20;
        default:
          return true;
      }
    });
  }, [recetas, filtro, query]);

  const toggleFavorito = async (r: Receta) => {
    if (!perfil) return;
    const existente = favMap[r.id];
    if (existente) {
      await fetch(`/api/favoritos?id=${existente}`, { method: 'DELETE' });
      setFavMap((m) => {
        const n = { ...m };
        delete n[r.id];
        return n;
      });
      mostrar('Quitado de favoritos');
    } else {
      const res = await fetch('/api/favoritos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: perfil.id, receta_id: r.id, tipo: 'receta' }),
      });
      const data = await res.json();
      if (data?.id) setFavMap((m) => ({ ...m, [r.id]: data.id }));
      mostrar('♥ Agregado a favoritos');
    }
  };

  return (
    <main className="min-h-screen px-4 pt-5">
      <header className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold">Todas las recetas</h1>
      </header>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none mb-3">
        {FILTROS.map((f) => {
          const activo = filtro === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-sm"
              style={{
                background: activo ? 'var(--color-primario)' : 'var(--color-superficie)',
                color: activo ? 'var(--color-sobre-primario)' : 'var(--color-texto-sec)',
                border: `1px solid ${activo ? 'var(--color-primario)' : 'var(--color-borde)'}`,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Buscador */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre..."
        className="w-full rounded-btn px-3 py-2.5 text-base outline-none mb-4"
        style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
      />

      {cargando ? (
        <div className="py-10 flex justify-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--color-primario)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : (
        <>
          <p className="text-xs mb-2" style={{ color: 'var(--color-texto-sec)' }}>
            {visibles.length} receta{visibles.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-col gap-3">
            {visibles.map((r) => (
              <RecipeCard
                key={r.id}
                receta={r}
                favorito={!!favMap[r.id]}
                onToggleFavorito={toggleFavorito}
                expandible
              />
            ))}
            {visibles.length === 0 && (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--color-texto-sec)' }}>
                No hay recetas que coincidan con el filtro.
              </p>
            )}
          </div>
        </>
      )}

      <BottomNav />
      {toast}
    </main>
  );
}
