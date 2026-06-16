'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus, Search } from 'lucide-react';
import type { Receta, TipoComida, UserProfile, AlimentoBusqueda } from '@/types';
import { getUserAsync, aplicarTema } from '@/lib/usuario';
import { fechaHoy, fechaLarga, slotsDe, sumarMacros, labelSlot } from '@/lib/util';
import BottomNav from '@/components/BottomNav';
import MacroBar from '@/components/MacroBar';
import FoodSearchResult from '@/components/FoodSearchResult';
import { useToast } from '@/components/Toast';

interface RegistroRow {
  id: number;
  tipo_comida: TipoComida;
  nombre_comida: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export default function RegistrarPage() {
  const router = useRouter();
  const { toast, mostrar } = useToast();

  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [tipoSel, setTipoSel] = useState<TipoComida>('desayuno');
  const [subtab, setSubtab] = useState<'recetas' | 'alimentos'>('recetas');
  const [registros, setRegistros] = useState<RegistroRow[]>([]);

  const [qReceta, setQReceta] = useState('');
  const [recetas, setRecetas] = useState<Receta[]>([]);

  const [qAlimento, setQAlimento] = useState('');
  const [alimentos, setAlimentos] = useState<AlimentoBusqueda[]>([]);
  const [buscandoAlimento, setBuscandoAlimento] = useState(false);

  const fecha = fechaHoy();

  const cargarRegistros = useCallback(async (u: UserProfile) => {
    const res = await fetch(`/api/registro?usuario_id=${u.id}&fecha=${fecha}`);
    const data = await res.json();
    setRegistros(Array.isArray(data) ? data : []);
  }, [fecha]);

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
      cargarRegistros(u);
    })();
    return () => {
      cancelado = true;
    };
  }, [router, cargarRegistros]);

  // Búsqueda local de recetas (filtra por nombre con debounce simple).
  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/recetas?buscar=${encodeURIComponent(qReceta)}&limite=30`);
      setRecetas(await res.json());
    }, 200);
    return () => clearTimeout(t);
  }, [qReceta]);

  const buscarAlimento = async () => {
    if (!qAlimento.trim()) return;
    setBuscandoAlimento(true);
    try {
      const res = await fetch(`/api/buscar?query=${encodeURIComponent(qAlimento)}`);
      setAlimentos(await res.json());
    } finally {
      setBuscandoAlimento(false);
    }
  };

  const registrar = async (payload: Partial<RegistroRow> & {
    receta_id?: number;
    fibra?: number;
    gramos?: number;
  }) => {
    if (!perfil) return;
    await fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: perfil.id,
        fecha,
        tipo_comida: tipoSel,
        ...payload,
      }),
    });
    await cargarRegistros(perfil);
    mostrar(`✅ Agregado a ${labelSlot(tipoSel)}`);
  };

  const agregarReceta = (r: Receta) =>
    registrar({
      receta_id: r.id,
      nombre_comida: r.nombre,
      calorias: r.calorias,
      proteinas: r.proteinas,
      carbohidratos: r.carbohidratos,
      grasas: r.grasas,
      fibra: r.fibra,
      gramos: 0,
    });

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
    }).then(() => {
      cargarRegistros(perfil);
      mostrar(`✅ Agregado a ${labelSlot(tipo)}`);
    });
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

  const borrar = async (id: number) => {
    if (!perfil) return;
    await fetch(`/api/registro?id=${id}`, { method: 'DELETE' });
    cargarRegistros(perfil);
  };

  if (!perfil) return <Spinner />;

  const slots = slotsDe(perfil.objetivo.comidas);
  const consumido = sumarMacros(registros);
  const obj = perfil.objetivo;
  const tipos = slots.map((s) => ({ value: s.value, label: s.label }));

  return (
    <main className="min-h-screen px-4 pt-5">
      <header className="mb-4">
        <h1 className="text-xl font-bold">¿Qué comiste?</h1>
        <p className="text-sm capitalize" style={{ color: 'var(--color-texto-sec)' }}>{fechaLarga()}</p>
      </header>

      {/* Tabs de comida */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none mb-4">
        {slots.map((s) => {
          const activo = tipoSel === s.value;
          return (
            <button
              key={s.value}
              onClick={() => setTipoSel(s.value)}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-medium"
              style={{
                background: activo ? 'var(--color-primario)' : 'var(--color-superficie)',
                color: activo ? 'var(--color-sobre-primario)' : 'var(--color-texto-sec)',
                border: `1px solid ${activo ? 'var(--color-primario)' : 'var(--color-borde)'}`,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Resumen del día */}
      <section
        className="rounded-card p-4 flex flex-col gap-3 mb-4"
        style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
      >
        <h3 className="font-semibold text-sm">Resumen del día</h3>
        <MacroBar label="Calorías" consumido={consumido.calorias} objetivo={obj.calorias} unidad=" kcal" />
        <MacroBar label="Proteínas" consumido={consumido.proteinas} objetivo={obj.proteinas} />
        <MacroBar label="Carbohidratos" consumido={consumido.carbohidratos} objetivo={obj.carbohidratos} />
        <MacroBar label="Grasas" consumido={consumido.grasas} objetivo={obj.grasas} />
      </section>

      {/* Subtabs */}
      <div className="flex gap-2 mb-3">
        <SubTab activo={subtab === 'recetas'} onClick={() => setSubtab('recetas')}>Recetas</SubTab>
        <SubTab activo={subtab === 'alimentos'} onClick={() => setSubtab('alimentos')}>Buscar alimento</SubTab>
      </div>

      {subtab === 'recetas' ? (
        <div className="flex flex-col gap-2">
          <BuscadorInput value={qReceta} onChange={setQReceta} placeholder="Filtrar recetas por nombre..." />
          {recetas.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-card p-3"
              style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{r.nombre}</p>
                <p className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>
                  🔥 {r.calorias} kcal · 🥩 {Math.round(r.proteinas)}g prot
                </p>
              </div>
              <button
                onClick={() => agregarReceta(r)}
                className="shrink-0 inline-flex items-center gap-1 rounded-btn px-3 py-2 text-sm font-semibold"
                style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
              >
                <Plus size={15} /> Agregar
              </button>
            </div>
          ))}
          {recetas.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-texto-sec)' }}>
              Sin coincidencias.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <BuscadorInput
              value={qAlimento}
              onChange={setQAlimento}
              placeholder="Ej: arroz, pechuga, manzana..."
              onEnter={buscarAlimento}
            />
            <button
              onClick={buscarAlimento}
              className="shrink-0 inline-flex items-center justify-center rounded-btn px-4"
              style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
            >
              <Search size={18} />
            </button>
          </div>
          {buscandoAlimento && <Spinner inline />}
          {!buscandoAlimento &&
            alimentos.map((a) => (
              <FoodSearchResult
                key={a.id}
                alimento={a}
                tipos={tipos}
                onRegistrar={registrarAlimento}
                onGuardar={guardarAlimento}
              />
            ))}
          {!buscandoAlimento && qAlimento && alimentos.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-texto-sec)' }}>
              Sin resultados. Probá con otro término.
            </p>
          )}
        </div>
      )}

      {/* Historial del día */}
      <section className="mt-6">
        <h3 className="font-semibold text-sm mb-2">Hoy registraste</h3>
        {registros.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
            Todavía no registraste nada hoy.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {registros.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-btn p-3"
                style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.nombre_comida}</p>
                  <p className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>
                    {labelSlot(r.tipo_comida)} · {r.calorias} kcal · {Math.round(r.proteinas)}g P ·{' '}
                    {Math.round(r.carbohidratos)}g C · {Math.round(r.grasas)}g G
                  </p>
                </div>
                <button onClick={() => borrar(r.id)} aria-label="Eliminar" className="shrink-0 p-1">
                  <Trash2 size={17} style={{ color: 'var(--color-error)' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <BottomNav />
      {toast}
    </main>
  );
}

function SubTab({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-btn py-2.5 text-sm font-medium"
      style={{
        background: activo ? 'var(--color-superficie-alt)' : 'transparent',
        color: activo ? 'var(--color-texto)' : 'var(--color-texto-sec)',
        border: `1px solid ${activo ? 'var(--color-primario)' : 'var(--color-borde)'}`,
      }}
    >
      {children}
    </button>
  );
}

function BuscadorInput({
  value,
  onChange,
  placeholder,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onEnter?: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
      placeholder={placeholder}
      className="w-full rounded-btn px-3 py-2.5 text-base outline-none"
      style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
    />
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
