'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { TipoComida, UserProfile, AlimentoBusqueda } from '@/types';
import { getUserAsync, aplicarTema } from '@/lib/usuario';
import { fechaHoy, slotsDe, labelSlot } from '@/lib/util';
import BottomNav from '@/components/BottomNav';
import FoodSearchResult from '@/components/FoodSearchResult';
import { useToast } from '@/components/Toast';

/**
 * Página standalone para consultar los macros reales de un alimento puntual
 * (ej: "¿cuántas proteínas tiene 100g de pechuga de pollo?").
 * Usa el mismo /api/buscar que ya prioriza la base curada en español
 * (data/ingredientes.json) antes de caer a USDA/Open Food Facts.
 * No toca el flujo de búsqueda dentro de "Agregar mi receta".
 */
export default function AlimentoPage() {
  const router = useRouter();
  const { toast, mostrar } = useToast();

  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [query, setQuery] = useState('');
  const [alimentos, setAlimentos] = useState<AlimentoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [hizoBusqueda, setHizoBusqueda] = useState(false);

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
      const res = await fetch(`/api/buscar?query=${encodeURIComponent(query)}`);
      setAlimentos(await res.json());
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

  if (!perfil) return <Spinner />;

  const slots = slotsDe(perfil.objetivo.comidas);
  const tipos = slots.map((s) => ({ value: s.value, label: s.label }));

  return (
    <main className="min-h-screen px-4 pt-6">
      <h1 className="text-xl font-bold mb-1 text-center">Macros de un alimento</h1>
      <p className="text-sm text-center mb-4" style={{ color: 'var(--color-texto-sec)' }}>
        Consultá los valores reales por 100g de cualquier ingrediente.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && buscar()}
          placeholder="Ej: pechuga de pollo, avena, banana..."
          className="w-full rounded-btn px-4 py-3 text-base outline-none"
          style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
        />
        <button
          onClick={buscar}
          className="shrink-0 inline-flex items-center justify-center rounded-btn px-4"
          style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
        >
          <Search size={20} />
        </button>
      </div>

      {buscando && <Spinner inline />}

      {!buscando && hizoBusqueda && (
        <div className="flex flex-col gap-2">
          {alimentos.map((a) => (
            <FoodSearchResult
              key={a.id}
              alimento={a}
              tipos={tipos}
              onRegistrar={registrarAlimento}
              onGuardar={guardarAlimento}
            />
          ))}
          {alimentos.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--color-texto-sec)' }}>
              Sin resultados para “{query}”. Probá otro término.
            </p>
          )}
        </div>
      )}

      {!hizoBusqueda && (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--color-texto-sec)' }}>
          Escribí un alimento y tocá buscar.
        </p>
      )}

      <BottomNav />
      {toast}
    </main>
  );
}

function Spinner({ inline }: { inline?: boolean }) {
  return (
    <div className={inline ? 'py-6 flex justify-center' : 'flex items-center justify-center h-screen'}>
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--color-primario)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
