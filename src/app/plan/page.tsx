'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, RotateCw, ClipboardCheck } from 'lucide-react';
import type { PlanDiario, Receta, TipoComida, UserProfile, MacroTotales } from '@/types';
import { getUserAsync, aplicarTema } from '@/lib/usuario';
import {
  fechaHoy,
  fechaLarga,
  slotsDe,
  sumarMacros,
  macrosVacios,
  labelSlot,
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
  const [slotsConsumidos, setSlotsConsumidos] = useState<Set<TipoComida>>(() => new Set<TipoComida>());
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
      const regs = Array.isArray(registros) ? registros : [];
      setConsumido(sumarMacros(regs));
      setSlotsConsumidos(new Set(regs.map((r: { tipo_comida: TipoComida }) => r.tipo_comida)));
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
        const planRes = await fetch(`/api/plan?usuario_id=${perfil.id}&fecha=${fecha}`);
        setPlan(await planRes.json());
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

  const registrarComido = async (slot: TipoComida, r: Receta) => {
    if (!perfil || slotsConsumidos.has(slot)) return; // ya registrado: evita duplicar
    await fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario_id: perfil.id,
        fecha,
        tipo_comida: slot,
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
    const regRes = await fetch(`/api/registro?usuario_id=${perfil.id}&fecha=${fecha}`);
    const registros = await regRes.json();
    const regs = Array.isArray(registros) ? registros : [];
    setConsumido(sumarMacros(regs));
    setSlotsConsumidos(new Set(regs.map((rg: { tipo_comida: TipoComida }) => rg.tipo_comida)));
    mostrar(`✅ ${r.nombre} registrado en ${labelSlot(slot)}`);
  };

  if (!perfil) return <Cargando />;

  const slots = slotsDe(perfil.objetivo.comidas);
  const hayPlan = plan && slots.some((s) => plan[s.value]);
  const obj = perfil.objetivo;
  const faltanKcal = Math.max(0, obj.calorias - consumido.calorias);
  const pctKcal = obj.calorias > 0 ? Math.round((consumido.calorias / obj.calorias) * 100) : 0;

  const chips = [
    { label: 'kcal', dot: 'var(--color-primario)', val: Math.round(consumido.calorias), obj: obj.calorias },
    { label: 'prot', dot: '#FF6B5E', val: Math.round(consumido.proteinas), obj: obj.proteinas },
    { label: 'carbs', dot: '#E0A93B', val: Math.round(consumido.carbohidratos), obj: obj.carbohidratos },
    { label: 'grasas', dot: '#5AA9E6', val: Math.round(consumido.grasas), obj: obj.grasas },
  ];

  return (
    <main className="min-h-screen">
      <header className="px-5 pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 22px)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[27px] font-extrabold" style={{ letterSpacing: '-0.7px' }}>
              Buen día, {perfil.nombre}
            </h1>
            <p className="mt-1 text-sm font-medium capitalize" style={{ color: 'var(--color-texto-sec)' }}>
              {fechaLarga()}
            </p>
          </div>
          <button
            onClick={() => setMenuAbierto(true)}
            aria-label="Menú"
            className="flex h-[42px] w-[42px] flex-none items-center justify-center"
            style={{ borderRadius: 14, background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)' }}
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Barra de progreso del día (calorías consumidas vs objetivo), estilo liquid glass */}
        <div className="glass mt-4 flex items-center gap-3" style={{ borderRadius: 14, padding: '10px 14px' }}>
          <span className="text-[12px] font-extrabold" style={{ color: 'var(--color-texto-soft)' }}>
            Hoy
          </span>
          <div
            className="h-[8px] flex-1 overflow-hidden rounded-full"
            style={{ background: 'color-mix(in srgb, var(--color-texto) 12%, transparent)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(pctKcal, 100)}%`, background: 'var(--gradiente-dorado)' }}
            />
          </div>
          <span className="text-[12px] font-extrabold tabular-nums" style={{ color: 'var(--color-primario)' }}>
            {pctKcal}%
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          {chips.map((c) => (
            <div
              key={c.label}
              className="flex-1"
              style={{ borderRadius: 16, padding: '12px 13px', background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span style={{ width: 8, height: 8, borderRadius: 3, background: c.dot }} />
                <span className="text-[11px] font-semibold" style={{ color: 'var(--color-texto-sec)' }}>
                  {c.label}
                </span>
              </div>
              <div className="text-[15px] font-extrabold" style={{ color: 'var(--color-texto)' }}>
                {c.val}
                <span className="text-xs font-semibold" style={{ color: 'var(--color-texto-3)' }}>
                  /{c.obj}
                </span>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-4 px-5 pt-1">
        {cargando ? (
          <Cargando inline />
        ) : !hayPlan ? (
          <div className="animar-entrada flex flex-col items-center gap-4 py-10 text-center">
            <div
              className="flex items-center justify-center"
              style={{ width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, color-mix(in srgb, var(--color-primario) 20%, transparent), transparent 70%)' }}
            >
              <ClipboardCheck size={36} strokeWidth={1.8} style={{ color: 'var(--color-primario)' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--color-texto-soft)', maxWidth: 230, lineHeight: 1.4 }}>
              Todavía no generaste tu plan de hoy
            </p>
            <button
              onClick={generarPlan}
              disabled={generando}
              className="btn-dorado flex h-[54px] items-center gap-2 px-7 text-base font-extrabold disabled:opacity-60"
              style={{ borderRadius: 16 }}
            >
              {generando && (
                <span
                  className="h-[18px] w-[18px] animate-spin rounded-full border-2"
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
                consumido={slotsConsumidos.has(s.value)}
                onFavorito={toggleFavorito}
                onCambiar={() => cambiarSlot(s.value)}
                onRegistrar={(r) => registrarComido(s.value, r)}
              />
            ))}

            <section style={{ borderRadius: 22, padding: 18, background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}>
              <h3 className="mb-3.5 text-[17px] font-extrabold" style={{ letterSpacing: '-0.4px' }}>
                Consumido hoy
              </h3>
              <div className="flex flex-col gap-3">
                <MacroBar label="Calorías" consumido={consumido.calorias} objetivo={obj.calorias} unidad=" kcal" />
                <MacroBar label="Proteínas" consumido={consumido.proteinas} objetivo={obj.proteinas} />
                <MacroBar label="Carbohidratos" consumido={consumido.carbohidratos} objetivo={obj.carbohidratos} />
                <MacroBar label="Grasas" consumido={consumido.grasas} objetivo={obj.grasas} />
              </div>
              <p className="mt-3 text-[13px] font-medium" style={{ color: 'var(--color-texto-sec)' }}>
                {consumido.calorias === 0
                  ? 'Marcá "Comí esto" en cada comida para ir sumando tu progreso del día.'
                  : faltanKcal > 0
                    ? `Te faltan ${faltanKcal} kcal para tu objetivo.`
                    : '¡Alcanzaste tu objetivo de calorías! 💪'}
              </p>
              <button
                onClick={generarPlan}
                disabled={generando}
                className="mt-3 flex h-[46px] w-full items-center justify-center gap-2 text-sm font-bold disabled:opacity-60"
                style={{ borderRadius: 13, border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
              >
                <RotateCw size={15} className={generando ? 'animate-spin' : ''} />
                {generando ? 'Generando...' : 'Regenerar plan'}
              </button>
            </section>
          </>
        )}

        <p className="px-1 pb-2 pt-1 text-center text-xs font-medium" style={{ color: 'var(--color-texto-3)', lineHeight: 1.5 }}>
          Orientación nutricional general · no reemplaza el consejo de un profesional de la salud.
        </p>
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
    <div className={inline ? 'flex justify-center py-10' : 'flex h-screen items-center justify-center'}>
      <div
        className="h-8 w-8 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--color-primario)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
