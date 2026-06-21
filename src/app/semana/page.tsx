'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import type { PlanSemana, TipoComida, UserProfile } from '@/types';
import { getUserAsync, aplicarTema } from '@/lib/usuario';
import { slotsDe, fechaHoy } from '@/lib/util';
import MealSlot from '@/components/MealSlot';
import BottomNav from '@/components/BottomNav';
import HamburgerMenu from '@/components/HamburgerMenu';
import { useToast } from '@/components/Toast';

const DIAS3 = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Lunes de la semana actual, en formato YYYY-MM-DD (clave de la DB). */
function lunesDeEstaSemana(): string {
  const d = new Date();
  const offset = (d.getDay() + 6) % 7; // días transcurridos desde el lunes
  d.setDate(d.getDate() - offset);
  return fechaHoy(d);
}

/** Las 7 fechas de la semana que arranca en `inicio`. */
function fechasSemana(inicio: string): string[] {
  const [y, m, dd] = inicio.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(y, m - 1, dd);
    x.setDate(x.getDate() + i);
    return fechaHoy(x);
  });
}

function dm(iso: string): string {
  const p = iso.split('-');
  return `${parseInt(p[2], 10)} ${MES3[parseInt(p[1], 10) - 1]}`;
}

export default function SemanaPage() {
  const router = useRouter();
  const { toast, mostrar } = useToast();

  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [semana, setSemana] = useState<PlanSemana | null>(null);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [cambiando, setCambiando] = useState<string | null>(null); // `${fecha}:${slot}`
  const [menuAbierto, setMenuAbierto] = useState(false);

  const inicio = useMemo(lunesDeEstaSemana, []);
  const fechas = useMemo(() => fechasSemana(inicio), [inicio]);
  const [diaSel, setDiaSel] = useState(() => (new Date().getDay() + 6) % 7);

  const cargarSemana = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/plan/semana?inicio=${inicio}`);
      if (res.status === 401) {
        router.replace('/login?next=/semana');
        return;
      }
      if (res.ok) setSemana(await res.json());
    } finally {
      setCargando(false);
    }
  }, [inicio, router]);

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
      await cargarSemana();
    })();
    return () => {
      cancelado = true;
    };
  }, [router, cargarSemana]);

  const generarSemana = async () => {
    setGenerando(true);
    try {
      const res = await fetch('/api/plan/semana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inicio }),
      });
      if (res.ok) {
        setSemana(await res.json());
        mostrar('✅ Semana generada');
      } else {
        mostrar('No se pudo generar la semana');
      }
    } finally {
      setGenerando(false);
    }
  };

  const cambiarComida = async (fecha: string, slot: TipoComida) => {
    if (!perfil) return;
    const o = perfil.objetivo;
    setCambiando(`${fecha}:${slot}`);
    try {
      const res = await fetch(
        `/api/plan/cambiar?slot=${slot}&fecha=${fecha}` +
          `&calorias=${o.calorias}&comidas=${o.comidas}` +
          `&proteinas=${o.proteinas}&carbohidratos=${o.carbohidratos}&grasas=${o.grasas}`
      );
      if (res.ok) {
        await cargarSemana(); // recargo para reflejar las porciones reescaladas del día
      } else {
        mostrar('No hay otra receta disponible');
      }
    } finally {
      setCambiando(null);
    }
  };

  if (!perfil) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--color-fondo)' }}>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--color-primario)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  const slots = slotsDe(perfil.objetivo.comidas);
  const diaData = semana?.dias[diaSel] ?? null;
  const haySemana = semana?.dias.some((d) => d) ?? false;

  return (
    <main className="min-h-screen">
      <header className="px-4 pt-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold">Tu semana</p>
            <p className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
              {dm(fechas[0])} – {dm(fechas[6])}
            </p>
          </div>
          <button onClick={() => setMenuAbierto(true)} aria-label="Menú" className="p-1">
            <Menu size={26} />
          </button>
        </div>

        {/* Selector de día */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto scrollbar-none">
          {fechas.map((f, i) => {
            const activo = i === diaSel;
            const tienePlan = !!semana?.dias[i];
            const esHoy = f === fechaHoy();
            return (
              <button
                key={f}
                onClick={() => setDiaSel(i)}
                className="flex shrink-0 flex-col items-center gap-0.5 rounded-btn px-3 py-2"
                style={{
                  minWidth: 46,
                  background: activo ? 'var(--color-primario)' : 'var(--color-superficie)',
                  border: `1px solid ${esHoy && !activo ? 'var(--color-primario)' : 'var(--color-borde)'}`,
                  color: activo ? 'var(--color-sobre-primario)' : 'var(--color-texto)',
                }}
              >
                <span className="text-[11px] font-medium" style={{ opacity: 0.85 }}>
                  {DIAS3[i]}
                </span>
                <span className="text-base font-bold leading-none">{parseInt(f.split('-')[2], 10)}</span>
                <span
                  className="h-1 w-1 rounded-full"
                  style={{ background: tienePlan ? (activo ? 'var(--color-sobre-primario)' : 'var(--color-primario)') : 'transparent' }}
                />
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4">
        {cargando ? (
          <div className="flex justify-center py-10">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2"
              style={{ borderColor: 'var(--color-primario)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : !haySemana ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <p style={{ color: 'var(--color-texto-sec)' }}>Todavía no generaste tu plan semanal.</p>
            <button
              onClick={generarSemana}
              disabled={generando}
              className="inline-flex items-center gap-2 rounded-btn px-6 py-3.5 text-base font-semibold disabled:opacity-60"
              style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
            >
              {generando && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2"
                  style={{ borderColor: 'var(--color-sobre-primario)', borderTopColor: 'transparent' }}
                />
              )}
              {generando ? 'Generando...' : 'Generar plan de la semana'}
            </button>
          </div>
        ) : !diaData ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <p style={{ color: 'var(--color-texto-sec)' }}>Este día todavía no tiene plan.</p>
            <button
              onClick={generarSemana}
              disabled={generando}
              className="rounded-btn px-6 py-3 text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
            >
              {generando ? 'Generando...' : '↻ Regenerar la semana'}
            </button>
          </div>
        ) : (
          <>
            {slots.map((s) => (
              <MealSlot
                key={s.value}
                titulo={s.label}
                hora={s.hora}
                receta={diaData[s.value] ?? undefined}
                cargandoCambio={cambiando === `${diaData.fecha}:${s.value}`}
                onCambiar={() => cambiarComida(diaData.fecha, s.value)}
              />
            ))}
            <button
              onClick={generarSemana}
              disabled={generando}
              className="mt-1 rounded-btn py-2.5 text-sm font-medium disabled:opacity-60"
              style={{ border: '1px solid var(--color-borde)' }}
            >
              {generando ? 'Generando...' : '↻ Regenerar toda la semana'}
            </button>
          </>
        )}

        <p className="pb-2 pt-1 text-center text-[10px]" style={{ color: 'var(--color-texto-sec)' }}>
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
