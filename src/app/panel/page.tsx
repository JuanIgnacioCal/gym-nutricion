'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { ArrowLeft, Users, Activity, UserCheck, CalendarPlus, Search, Info, KeyRound } from 'lucide-react';
import type { ObjetivoTipo, PanelData, PanelSocio } from '@/types';
import { useGymConfig } from '@/lib/useGymConfig';
import ResetClaveModal from '@/components/ResetClaveModal';
import { useToast } from '@/components/Toast';

type Metric = 'planes' | 'comidas';
type Gran = 'dia' | 'semana';
type SortKey = 'nombre' | 'email' | 'alta' | 'ultimo' | 'kcal' | 'estado';
type Estado = 'activo' | 'poco' | 'inactivo';

const OPC_METRIC: [Metric, string][] = [
  ['planes', 'Planes generados'],
  ['comidas', 'Comidas registradas'],
];
const OPC_GRAN: [Gran, string][] = [
  ['dia', 'Por día'],
  ['semana', 'Por semana'],
];

const ESTADO_META: Record<Estado, { label: string; rank: number; bg: string; color: string }> = {
  activo: { label: 'Activo', rank: 2, bg: 'color-mix(in srgb, var(--color-exito) 15%, transparent)', color: 'var(--color-exito)' },
  poco: { label: 'Poco activo', rank: 1, bg: 'color-mix(in srgb, var(--color-primario) 15%, transparent)', color: 'var(--color-primario)' },
  inactivo: { label: 'Inactivo', rank: 0, bg: 'color-mix(in srgb, var(--color-texto-sec) 18%, transparent)', color: 'var(--color-texto-sec)' },
};

const OBJ_META: Record<ObjetivoTipo, { label: string; bg: string; color: string }> = {
  bajar: { label: 'Bajar', bg: 'color-mix(in srgb, var(--color-primario) 16%, transparent)', color: 'var(--color-primario)' },
  mantener: { label: 'Mantener', bg: 'color-mix(in srgb, var(--color-texto-sec) 20%, transparent)', color: 'var(--color-texto-sec)' },
  subir: { label: 'Subir', bg: 'color-mix(in srgb, var(--color-exito) 18%, transparent)', color: 'var(--color-exito)' },
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fmtFechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d, 10)} ${MESES[parseInt(m, 10) - 1]} ${y}`;
}
function fmtFechaCorta(iso: string | null): string {
  if (!iso) return '—';
  return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(2, 4);
}
function diasEntre(desdeIso: string, hastaIso: string): number {
  const a = new Date(desdeIso + 'T00:00:00').getTime();
  const b = new Date(hastaIso + 'T00:00:00').getTime();
  return Math.round((b - a) / 86400000);
}
function estadoDe(ultimo: string | null, hoy: string): Estado {
  if (!ultimo) return 'inactivo';
  const d = diasEntre(ultimo, hoy);
  if (d <= 7) return 'activo';
  if (d <= 30) return 'poco';
  return 'inactivo';
}
function conic(segs: { val: number; color: string }[], total: number): string {
  if (total <= 0) return 'var(--color-superficie-alt)';
  let acc = 0;
  const parts: string[] = [];
  for (const s of segs) {
    if (s.val <= 0) continue;
    const start = (acc / total) * 100;
    acc += s.val;
    const end = (acc / total) * 100;
    parts.push(`${s.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
  }
  return parts.length ? `conic-gradient(${parts.join(', ')})` : 'var(--color-superficie-alt)';
}

function GraficoTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const v = payload[0].value;
  const valor = typeof v === 'number' ? v : Number(v ?? 0);
  return (
    <div
      style={{
        background: 'var(--color-superficie-alt)',
        border: '1px solid var(--color-borde)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12.5,
      }}
    >
      <span style={{ color: 'var(--color-primario)', fontWeight: 600 }}>{valor}</span>
      <span style={{ color: 'var(--color-texto-sec)' }}> · {label}</span>
    </div>
  );
}

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div
      className="inline-flex gap-0.5 rounded-btn p-0.5"
      style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)' }}
    >
      {options.map(([val, label]) => {
        const on = val === value;
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            className="rounded-[7px] px-3 py-1.5 text-xs"
            style={{
              background: on ? 'var(--color-primario)' : 'transparent',
              color: on ? 'var(--color-sobre-primario)' : 'var(--color-texto-sec)',
              fontWeight: on ? 600 : 500,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  destacado,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  sub: string;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-card border border-borde p-4" style={{ background: 'var(--color-superficie)' }}>
      <div
        className="mb-3 flex h-8 w-8 items-center justify-center rounded-btn"
        style={{ background: 'var(--color-superficie-alt)', color: 'var(--color-primario)' }}
      >
        {icon}
      </div>
      <div className="text-xs text-texto-sec">{label}</div>
      <div className="mt-1 text-3xl font-bold leading-none">{value}</div>
      <div className="mt-2 text-xs" style={{ color: destacado ? 'var(--color-exito)' : 'var(--color-texto-sec)' }}>
        {sub}
      </div>
    </div>
  );
}

function Centro({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)' }}
    >
      {children}
    </div>
  );
}

export default function PanelPage() {
  const router = useRouter();
  const gym = useGymConfig();
  const { toast, mostrar } = useToast();
  const [resetSocio, setResetSocio] = useState<PanelSocio | null>(null);
  const [data, setData] = useState<PanelData | null>(null);
  const [estadoCarga, setEstadoCarga] = useState<'cargando' | 'ok' | 'denegado' | 'error'>('cargando');
  const [metric, setMetric] = useState<Metric>('planes');
  const [gran, setGran] = useState<Gran>('dia');
  const [sortKey, setSortKey] = useState<SortKey>('ultimo');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    let cancelado = false;
    fetch('/api/panel')
      .then(async (r) => {
        if (cancelado) return;
        if (r.status === 401) {
          router.replace('/login?next=/panel');
          return;
        }
        if (r.status === 403) {
          setEstadoCarga('denegado');
          return;
        }
        if (!r.ok) {
          setEstadoCarga('error');
          return;
        }
        const d = (await r.json()) as PanelData;
        if (cancelado) return;
        setData(d);
        setEstadoCarga('ok');
      })
      .catch(() => {
        if (!cancelado) setEstadoCarga('error');
      });
    return () => {
      cancelado = true;
    };
  }, [router]);

  const chartData = useMemo(() => {
    if (!data) return [] as { label: string; valor: number }[];
    const s = data.serie[gran];
    return s.labels.map((label, i) => ({ label, valor: s[metric][i] }));
  }, [data, gran, metric]);

  const sociosVisibles = useMemo(() => {
    if (!data) return [] as PanelSocio[];
    const hoy = data.generadoEl;
    const q = busqueda.trim().toLowerCase();
    const filtrados = data.socios.filter(
      (s) => !q || s.nombre.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
    const valor = (s: PanelSocio): string | number => {
      switch (sortKey) {
        case 'nombre':
          return s.nombre.toLowerCase();
        case 'email':
          return s.email.toLowerCase();
        case 'alta':
          return s.alta;
        case 'ultimo':
          return s.ultimo ?? '';
        case 'kcal':
          return s.kcal;
        case 'estado':
          return ESTADO_META[estadoDe(s.ultimo, hoy)].rank;
        default:
          return '';
      }
    };
    const cmp = (a: PanelSocio, b: PanelSocio): number => {
      const va = valor(a);
      const vb = valor(b);
      if (typeof va === 'number' && typeof vb === 'number') return va - vb;
      return String(va).localeCompare(String(vb));
    };
    return [...filtrados].sort((a, b) => sortDir * cmp(a, b));
  }, [data, busqueda, sortKey, sortDir]);

  if (estadoCarga === 'cargando') {
    return <Centro><p className="text-texto-sec">Cargando panel…</p></Centro>;
  }
  if (estadoCarga === 'denegado') {
    return (
      <Centro>
        <p className="text-lg font-semibold">Acceso solo para el dueño</p>
        <p className="mt-1 text-sm text-texto-sec">Esta sección es exclusiva del administrador del gimnasio.</p>
        <button
          onClick={() => router.push('/plan')}
          className="mt-5 rounded-btn px-5 py-2.5 text-sm font-semibold"
          style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
        >
          Volver a mi plan
        </button>
      </Centro>
    );
  }
  if (estadoCarga === 'error' || !data) {
    return (
      <Centro>
        <p className="font-semibold">No se pudo cargar el panel</p>
        <p className="mt-1 text-sm text-texto-sec">Revisá tu conexión e intentá de nuevo.</p>
        <button
          onClick={() => router.refresh()}
          className="mt-5 rounded-btn px-5 py-2.5 text-sm font-semibold"
          style={{ border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
        >
          Reintentar
        </button>
      </Centro>
    );
  }

  const total = data.kpis.total;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const { bajar, mantener, subir, sin_definir } = data.objetivos;
  const donutBg = conic(
    [
      { val: bajar, color: 'var(--color-primario)' },
      { val: mantener, color: 'var(--color-texto-sec)' },
      { val: subir, color: 'var(--color-exito)' },
      { val: sin_definir, color: 'var(--color-borde)' },
    ],
    total,
  );
  const c3 = data.comidasSplit.tres;
  const c4 = data.comidasSplit.cuatro;
  const sumComidas = c3 + c4 || 1;

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setSortDir(k === 'nombre' || k === 'email' ? 1 : -1);
    }
  };
  const th = (k: SortKey, label: string) => (
    <th
      onClick={() => toggleSort(k)}
      className="cursor-pointer select-none whitespace-nowrap border-b border-borde px-2.5 py-2 text-left text-[11.5px] font-semibold uppercase tracking-wide text-texto-sec"
    >
      {label} <span className="opacity-70">{sortKey === k ? (sortDir > 0 ? '↑' : '↓') : '↕'}</span>
    </th>
  );

  const legendRow = (color: string, label: string, n: number) => (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]" style={{ background: color }} />
      {label}
      <b className="ml-auto font-semibold">{n}</b>
      <span className="w-9 text-right text-xs text-texto-sec">{pct(n)}%</span>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)' }}>
      <header
        className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-borde px-5 py-3.5"
        style={{ background: 'var(--color-fondo)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/plan')}
            aria-label="Volver"
            className="flex h-9 w-9 items-center justify-center rounded-btn"
            style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-semibold leading-tight">{gym.nombre}</h1>
            <p className="text-xs text-texto-sec">Panel del dueño</p>
          </div>
        </div>
        <span className="text-xs text-texto-sec">{fmtFechaLarga(data.generadoEl)}</span>
      </header>

      <main className="mx-auto max-w-5xl p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<Users size={18} />}
            label="Total de socios"
            value={total}
            sub={`${data.kpis.altasMes} altas este mes`}
            destacado={data.kpis.altasMes > 0}
          />
          <KpiCard icon={<Activity size={18} />} label="Activos últimos 7 días" value={data.kpis.activos7} sub={`${pct(data.kpis.activos7)}% del total`} />
          <KpiCard icon={<UserCheck size={18} />} label="Activos últimos 30 días" value={data.kpis.activos30} sub={`${pct(data.kpis.activos30)}% del total`} />
          <KpiCard icon={<CalendarPlus size={18} />} label="Altas de este mes" value={data.kpis.altasMes} sub="Socios nuevos" />
        </div>

        <section className="mt-6 rounded-card border border-borde p-5" style={{ background: 'var(--color-superficie)' }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Actividad</h2>
            <div className="flex flex-wrap gap-2">
              <Seg value={metric} onChange={setMetric} options={OPC_METRIC} />
              <Seg value={gran} onChange={setGran} options={OPC_GRAN} />
            </div>
          </div>
          <div style={{ width: '100%', height: 290 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 6, right: 10, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--color-borde)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--color-texto-sec)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-borde)' }}
                  interval={gran === 'dia' ? 1 : 0}
                />
                <YAxis
                  tick={{ fill: 'var(--color-texto-sec)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={34}
                  allowDecimals={false}
                />
                <Tooltip content={<GraficoTooltip />} cursor={{ stroke: 'var(--color-borde)' }} />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="var(--color-primario)"
                  strokeWidth={2.5}
                  fill="var(--color-primario)"
                  fillOpacity={0.15}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--color-fondo)', stroke: 'var(--color-primario)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-texto-sec">
            {metric === 'planes' ? 'Planes generados' : 'Comidas registradas'} · {gran === 'dia' ? 'últimos 14 días' : 'últimas 8 semanas'}
          </p>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <section className="rounded-card border border-borde p-5 lg:col-span-2" style={{ background: 'var(--color-superficie)' }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                Socios <span className="text-xs font-medium text-texto-sec">· {sociosVisibles.length === total ? total : `${sociosVisibles.length} de ${total}`}</span>
              </h2>
              <div
                className="flex items-center gap-2 rounded-btn px-3 py-2"
                style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)' }}
              >
                <Search size={15} className="text-texto-sec" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar socio…"
                  className="w-36 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--color-texto)' }}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {th('nombre', 'Nombre')}
                    {th('email', 'Email')}
                    {th('alta', 'Alta')}
                    {th('ultimo', 'Últ. activo')}
                    {th('kcal', 'Objetivo')}
                    {th('estado', 'Estado')}
                    <th className="whitespace-nowrap border-b border-borde px-2.5 py-2 text-left text-[11.5px] font-semibold uppercase tracking-wide text-texto-sec">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sociosVisibles.map((s) => {
                    const em = ESTADO_META[estadoDe(s.ultimo, data.generadoEl)];
                    const om = s.objetivo_tipo ? OBJ_META[s.objetivo_tipo] : null;
                    return (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap border-b border-borde px-2.5 py-3 font-medium">{s.nombre}</td>
                        <td className="whitespace-nowrap border-b border-borde px-2.5 py-3 text-texto-sec">{s.email}</td>
                        <td className="whitespace-nowrap border-b border-borde px-2.5 py-3 text-texto-sec">{fmtFechaCorta(s.alta)}</td>
                        <td className="whitespace-nowrap border-b border-borde px-2.5 py-3 text-texto-sec">{fmtFechaCorta(s.ultimo)}</td>
                        <td className="whitespace-nowrap border-b border-borde px-2.5 py-3">
                          <span className="font-semibold">{s.kcal}</span>
                          {om && (
                            <span
                              className="ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{ background: om.bg, color: om.color }}
                            >
                              {om.label}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap border-b border-borde px-2.5 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                            style={{ background: em.bg, color: em.color }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
                            {em.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap border-b border-borde px-2.5 py-3">
                          {s.esDueno ? (
                            <span className="text-xs text-texto-sec">Vos</span>
                          ) : (
                            <button
                              onClick={() => setResetSocio(s)}
                              className="inline-flex items-center gap-1.5 rounded-btn px-2.5 py-1.5 text-xs font-semibold"
                              style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
                            >
                              <KeyRound size={13} /> Resetear clave
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {sociosVisibles.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-7 text-center text-texto-sec">
                        Sin resultados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-card border border-borde p-5" style={{ background: 'var(--color-superficie)' }}>
            <h2 className="mb-4 text-base font-semibold">Objetivos</h2>
            <div className="mb-5 flex items-center gap-5">
              <div className="relative h-[108px] w-[108px] flex-shrink-0 rounded-full" style={{ background: donutBg }}>
                <div className="absolute inset-[15px] rounded-full" style={{ background: 'var(--color-superficie)' }} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <b className="text-xl font-bold">{total}</b>
                  <span className="text-[10.5px] text-texto-sec">socios</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {legendRow('var(--color-primario)', 'Bajar', bajar)}
                {legendRow('var(--color-texto-sec)', 'Mantener', mantener)}
                {legendRow('var(--color-exito)', 'Subir', subir)}
                {sin_definir > 0 && legendRow('var(--color-borde)', 'Sin definir', sin_definir)}
              </div>
            </div>
            <div className="border-t border-borde pt-4">
              <div className="text-xs text-texto-sec">Calorías objetivo promedio</div>
              <div className="text-2xl font-bold">
                {data.kcalPromedio.toLocaleString('es-AR')} <span className="text-sm font-medium text-texto-sec">kcal/día</span>
              </div>
            </div>
            <div className="mt-4 border-t border-borde pt-4">
              <div className="text-xs text-texto-sec">Comidas por día</div>
              <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--color-superficie-alt)' }}>
                <div style={{ width: `${(c3 / sumComidas) * 100}%`, background: 'var(--color-primario)' }} />
                <div style={{ width: `${(c4 / sumComidas) * 100}%`, background: 'color-mix(in srgb, var(--color-primario) 35%, var(--color-superficie-alt))' }} />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-texto-sec">
                <span>3 comidas · {c3}</span>
                <span>{c4} · 4 comidas</span>
              </div>
            </div>
          </section>
        </div>

        <section
          className="mt-6 rounded-card border border-borde p-5 text-sm text-texto-sec"
          style={{ background: 'var(--color-superficie)' }}
        >
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-texto)' }}>
            <Info size={16} style={{ color: 'var(--color-primario)' }} /> Cómo leer este panel
          </h3>
          <p className="leading-relaxed">
            Un <b style={{ color: 'var(--color-texto)' }}>socio activo</b> generó un plan o registró una comida dentro de la ventana indicada. En la tabla:
            Activo ≤ 7 días, Poco activo 8–30 días, Inactivo más de 30 días sin usar la app.
          </p>
        </section>
      </main>

      {resetSocio && (
        <ResetClaveModal
          socio={resetSocio}
          onClose={() => setResetSocio(null)}
          onDone={(m) => mostrar(m)}
        />
      )}
      {toast}
    </div>
  );
}
