'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import type { PlanDiario, Receta, TipoComida, UserProfile, MacroTotales } from '@/types';
import { getUserAsync, aplicarTema } from '@/lib/usuario';
import {
  fechaHoy,
  fechaLarga,
  slotsDe,
  colorChip,
  sumarMacros,
  macrosVacios,
} from '@/lib/util';
import BottomNav from '@/components/BottomNav';
import HamburgerMenu from '@/components/HamburgerMenu';
import MealSlot from '@/components/MealSlot';
import MacroBar from '@/components/MacroBar';
import { useToast } from '@/components/Toast';

export default function PlanPage() {
  const router = useRouter();
  const { toast, mostrar } = useToast();

  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<PlanDiario | null>(null);
  const [consumido, setConsumido] = useState<MacroTotales>(macrosVacios());
  const [favMap, setFavMap] = useState<Record<number, number>>({});
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [cambiando, setCambiando] = useState<TipoComida | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const fecha = fechaHoy();

  const cargarDatos = useCallback(async (u: UserProfile) => {
    setCargando(true);
    try {
      const [planRes, regRes, favRes] = await Promise.all([
        fetch(`/api/plan?usuario_id=${u.id}&fecha=${fecha}`),
        fetch(`/api/registro?usuario_id=${u.id}&fecha=${fecha}`),
        fetch(`/api/favoritos?usuario_id=${u.id}&tipo=receta`),
      ]);
      setPlan(await planRes.json());
      const registros = await regRes.json();
      setConsumido(sumarMacros(Array.isArray(registros) ? registros : []));
      const favs = await favRes.json();
      const map: Record<number, number> = {};
      if (Array.isArray(favs)) {
        for (const f of favs) if (f.receta?.id) map[f.receta.id] = f.id;
      }
      setFavMap(map);
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const u = await getUserAsync();
      if (cancelado) return;
      if (!u || (u.onboardingCompleto === false)) {
        router.replace('/onboarding');
        return;
      }
      aplicarTema(u.tema);
      setPerfil(u);
      cargarDatos(u);
    })();
    return () => {
      cancelado = true;
    };
  }, [router, cargarDatos]);

  const generarPlan = async () => {
    if (!perfil) return;
    setGenerando(true);
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: perfil.id, fecha, objetivo: perfil.objetivo }),
      });
      setPlan(await res.json());
    } finally {
      setGenerando(false);
    }
  };

  const cambiarSlot = async (slot: TipoComida) => {
    if (!perfil) return;
    setCambiando(slot);
    try {
      const res = await fetch(
        `/api/plan/cambiar?slot=${slot}&usuario_id=${perfil.id}&fecha=${fecha}` +
          `&calorias=${perfil.objetivo.calorias}&comidas=${perfil.objetivo.comidas}` +
          `&proteinas=${perfil.objetivo.proteinas}&carbohidratos=${perfil.objetivo.carbohidratos}` +
          `&grasas=${perfil.objetivo.grasas}`
      );
      if (res.ok) {
        const nueva: Receta = await res.json();
        setPlan((p) => (p ? { ...p, [slot]: nueva } : p));
      } else {
        mostrar('No hay otra receta disponible');
      }
    } finally {
      setCambiando(null);
    }
  };

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

  if (!perfil) return <Cargando />;

  const slots = slotsDe(perfil.objetivo.comidas);
  const hayPlan = plan && slots.some((s) => plan[s.value]);
  const totalesPlan = hayPlan
    ? sumarMacros(slots.map((s) => plan![s.value]).filter(Boolean) as Receta[])
    : macrosVacios();
  const obj = perfil.objetivo;
  const faltanKcal = Math.max(0, obj.calorias - totalesPlan.calorias);

  const chips = [
    { icon: '🔥', val: Math.round(consumido.calorias), obj: obj.calorias, u: 'kcal' },
    { icon: '🥩', val: Math.round(consumido.proteinas), obj: obj.proteinas, u: 'g prot' },
    { icon: '🌾', val: Math.round(consumido.carbohidratos), obj: obj.carbohidratos, u: 'g carbs' },
    { icon: '💧', val: Math.round(consumido.grasas), obj: obj.grasas, u: 'g gras' },
  ];

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="px-4 pt-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold">Buen día, {perfil.nombre}</p>
            <p className="text-sm capitalize" style={{ color: 'var(--color-texto-sec)' }}>
              {fechaLarga()}
            </p>
          </div>
          <button onClick={() => setMenuAbierto(true)} aria-label="Menú" className="p-1">
            <Menu size={26} />
          </button>
        </div>

        {/* Chips de macros del día (consumido vs objetivo) */}
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
          {chips.map((c) => (
            <span
              key={c.u}
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs"
              style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
            >
              <span>{c.icon}</span>
              <span style={{ color: colorChip(c.val, c.obj) }}>
                {c.val}/{c.obj}
              </span>
              <span style={{ color: 'var(--color-texto-sec)' }}>{c.u}</span>
            </span>
          ))}
        </div>
      </header>

      <div className="px-4 flex flex-col gap-3">
        {cargando ? (
          <Cargando inline />
        ) : !hayPlan ? (
          <div className="py-10 text-center flex flex-col items-center gap-4">
            <p style={{ color: 'var(--color-texto-sec)' }}>
              Todavía no generaste tu plan de hoy.
            </p>
            <button
              onClick={generarPlan}
              disabled={generando}
              className="rounded-btn px-6 py-3.5 text-base font-semibold inline-flex items-center gap-2 disabled:opacity-60"
              style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
            >
              {generando && (
                <span
                  className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'var(--color-sobre-primario)', borderTopColor: 'transparent' }}
                />
              )}
              {generando ? 'Generando...' : 'Generar plan para hoy'}
            </button>
          </div>
        ) : (
          <>
            {slots.map((s) => (
              <MealSlot
                key={s.value}
                titulo={s.label}
                hora={s.hora}
                receta={plan![s.value]}
                favorito={!!(plan![s.value] && favMap[plan![s.value]!.id])}
                cargandoCambio={cambiando === s.value}
                onFavorito={toggleFavorito}
                onCambiar={() => cambiarSlot(s.value)}
              />
            ))}

            {/* Totales del plan vs objetivo */}
            <section
              className="rounded-card p-4 flex flex-col gap-3 mt-1"
              style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
            >
              <h3 className="font-semibold">Totales del plan</h3>
              <MacroBar label="Calorías" consumido={totalesPlan.calorias} objetivo={obj.calorias} unidad=" kcal" />
              <MacroBar label="Proteínas" consumido={totalesPlan.proteinas} objetivo={obj.proteinas} />
              <MacroBar label="Carbohidratos" consumido={totalesPlan.carbohidratos} objetivo={obj.carbohidratos} />
              <MacroBar label="Grasas" consumido={totalesPlan.grasas} objetivo={obj.grasas} />
              <p className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
                {faltanKcal > 0
                  ? `Te faltan ${faltanKcal} kcal para llegar a tu objetivo.`
                  : 'Tu plan cubre tu objetivo de calorías. 💪'}
              </p>
              <button
                onClick={generarPlan}
                disabled={generando}
                className="rounded-btn py-2.5 text-sm font-medium disabled:opacity-60"
                style={{ border: '1px solid var(--color-borde)' }}
              >
                {generando ? 'Generando...' : '↻ Regenerar plan completo'}
              </button>
            </section>
          </>
        )}
      </div>

      <HamburgerMenu
        abierto={menuAbierto}
        onClose={() => setMenuAbierto(false)}
        onPerfilActualizado={(p) => {
          setPerfil(p);
          aplicarTema(p.tema);
        }}
      />
      <BottomNav />
      {toast}
    </main>
  );
}

function Cargando({ inline }: { inline?: boolean }) {
  return (
    <div className={inline ? 'py-10 flex justify-center' : 'flex items-center justify-center h-screen'}>
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--color-primario)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
