'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ClipboardList, Search, Pencil, Sun, Moon, ChefHat, Apple, Calculator, ChevronDown } from 'lucide-react';
import type { UserProfile } from '@/types';
import { getUserAsync, saveUser, aplicarTema } from '@/lib/usuario';
import { useGymConfig } from '@/lib/useGymConfig';
import ObjetivosFields, { Objetivo } from './ObjetivosFields';
import AgregarRecetaModal from './AgregarRecetaModal';
import { useToast } from './Toast';
import { calcularTDEE, OPC_SEXO, OPC_ACTIVIDAD, OPC_OBJETIVO } from '@/lib/calorias';

type DatosFisicos = NonNullable<UserProfile['datos_fisicos']>;
const DF_DEFAULT: DatosFisicos = {
  peso: 70, altura: 170, edad: 30,
  sexo: 'masculino', nivel_actividad: 'moderado', objetivo_tipo: 'mantener',
};

interface HamburgerMenuProps {
  abierto: boolean;
  onClose: () => void;
  /** Se llama cuando cambian objetivos/perfil para que la página se refresque. */
  onPerfilActualizado?: (perfil: UserProfile) => void;
}

export default function HamburgerMenu({ abierto, onClose, onPerfilActualizado }: HamburgerMenuProps) {
  const router = useRouter();
  const gym = useGymConfig();
  const { toast, mostrar } = useToast();

  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [editandoObjetivos, setEditandoObjetivos] = useState(false);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [df, setDf] = useState<DatosFisicos>(DF_DEFAULT);
  const [mostrarRecalc, setMostrarRecalc] = useState(false);
  const [dfTocado, setDfTocado] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [agregarReceta, setAgregarReceta] = useState(false);

  useEffect(() => {
    if (abierto) {
      let cancelado = false;
      (async () => {
        const u = await getUserAsync();
        if (cancelado) return;
        setPerfil(u);
        if (u) {
          setObjetivo(u.objetivo);
          setDf(u.datos_fisicos ?? DF_DEFAULT);
          setNombre(u.nombre);
          setEmail(u.email);
        }
        setEditandoObjetivos(false);
        setMostrarRecalc(false);
        setDfTocado(false);
      })();
      return () => {
        cancelado = true;
      };
    }
  }, [abierto]);

  const persistir = async (cambios: Partial<UserProfile>): Promise<boolean> => {
    if (!perfil) return false;
    const nuevo: UserProfile = { ...perfil, ...cambios };
    setPerfil(nuevo);
    saveUser(nuevo); // cache local como fallback offline
    onPerfilActualizado?.(nuevo);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevo.nombre,
          tema: nuevo.tema,
          objetivo: nuevo.objetivo,
          datos_fisicos: nuevo.datos_fisicos,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const guardarObjetivos = async () => {
    if (!objetivo) return;
    const cambios: Partial<UserProfile> = dfTocado ? { objetivo, datos_fisicos: df } : { objetivo };
    const ok = await persistir(cambios);
    setEditandoObjetivos(false);
    setMostrarRecalc(false);
    setDfTocado(false);
    mostrar(ok ? '✅ Objetivos actualizados' : '⚠️ Guardado local (revisá tu conexión)');
  };

  const updateDf = (cambios: Partial<DatosFisicos>) => {
    setDf((prev) => ({ ...prev, ...cambios }));
    setDfTocado(true);
  };

  const recalcular = () => {
    const comidas = objetivo?.comidas ?? 3;
    setObjetivo(
      calcularTDEE(df.peso, df.altura, df.edad, df.sexo, df.nivel_actividad, df.objetivo_tipo, comidas),
    );
    setDfTocado(true);
  };

  const toggleTema = () => {
    if (!perfil) return;
    const nuevoTema = perfil.tema === 'oscuro' ? 'claro' : 'oscuro';
    aplicarTema(nuevoTema);
    void persistir({ tema: nuevoTema });
  };

  const guardarPerfil = async () => {
    const ok = await persistir({ nombre });
    mostrar(ok ? '✅ Perfil actualizado' : '⚠️ Guardado local (revisá tu conexión)');
  };

  const irA = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity ${
          abierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      {/* Panel */}
      <aside
        className="fixed top-0 right-0 z-50 h-full w-[85%] max-w-sm overflow-y-auto transition-transform duration-300"
        style={{
          background: 'var(--color-superficie)',
          borderLeft: '1px solid var(--color-borde)',
          transform: abierto ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {perfil && (
          <div className="flex flex-col gap-6 p-5 pb-24">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gym.logo}
                  alt={gym.nombre}
                  className="h-10 w-10 rounded-btn object-cover"
                  style={{ background: 'var(--color-superficie-alt)' }}
                  onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
                />
                <div>
                  <p className="font-bold leading-tight">{gym.nombre}</p>
                  <p className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>
                    {perfil.nombre}
                  </p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Cerrar menú">
                <X size={22} />
              </button>
            </div>

            {/* Explorar */}
            <section>
              <h4 className="mb-2 text-xs uppercase tracking-wide" style={{ color: 'var(--color-texto-sec)' }}>
                Explorar
              </h4>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => irA('/recetas')}
                  className="flex items-center gap-3 rounded-btn px-3 py-3 text-left text-sm"
                  style={{ background: 'var(--color-superficie-alt)' }}
                >
                  <ClipboardList size={18} style={{ color: 'var(--color-primario)' }} /> Todas las recetas
                </button>
                <button
                  onClick={() => irA('/buscar')}
                  className="flex items-center gap-3 rounded-btn px-3 py-3 text-left text-sm"
                  style={{ background: 'var(--color-superficie-alt)' }}
                >
                  <Search size={18} style={{ color: 'var(--color-primario)' }} /> Buscar receta
                </button>
                <button
                  onClick={() => setAgregarReceta(true)}
                  className="flex items-center gap-3 rounded-btn px-3 py-3 text-left text-sm"
                  style={{ background: 'var(--color-superficie-alt)' }}
                >
                  <ChefHat size={18} style={{ color: 'var(--color-primario)' }} /> Agregar mi receta
                </button>
                <button
                  onClick={() => irA('/alimento')}
                  className="flex items-center gap-3 rounded-btn px-3 py-3 text-left text-sm"
                  style={{ background: 'var(--color-superficie-alt)' }}
                >
                  <Apple size={18} style={{ color: 'var(--color-primario)' }} /> Buscar macros de un alimento
                </button>
              </div>
            </section>

            {/* Mis objetivos */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-texto-sec)' }}>
                  Mis objetivos
                </h4>
                {!editandoObjetivos && (
                  <button
                    onClick={() => setEditandoObjetivos(true)}
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: 'var(--color-primario)' }}
                  >
                    <Pencil size={13} /> Editar
                  </button>
                )}
              </div>

              {editandoObjetivos && objetivo ? (
                <div className="flex flex-col gap-3">
                  <ObjetivosFields valor={objetivo} onChange={setObjetivo} />

                  {/* Recalcular desde datos físicos (plegable, para no saturar la pantalla) */}
                  <div className="rounded-btn" style={{ border: '1px solid var(--color-borde)' }}>
                    <button
                      type="button"
                      onClick={() => setMostrarRecalc((v) => !v)}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <Calculator size={16} style={{ color: 'var(--color-primario)' }} />
                        Recalcular desde mis datos
                      </span>
                      <ChevronDown
                        size={16}
                        style={{ transform: mostrarRecalc ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
                      />
                    </button>
                    {mostrarRecalc && (
                      <div className="flex flex-col gap-3 px-3 pb-3">
                        <div className="grid grid-cols-3 gap-2">
                          <NumChico label="Peso (kg)" value={df.peso} onChange={(n) => updateDf({ peso: n })} />
                          <NumChico label="Altura (cm)" value={df.altura} onChange={(n) => updateDf({ altura: n })} />
                          <NumChico label="Edad" value={df.edad} onChange={(n) => updateDf({ edad: n })} />
                        </div>
                        <Selector label="Sexo" opciones={OPC_SEXO} valor={df.sexo} onPick={(v) => updateDf({ sexo: v })} />
                        <Selector label="Actividad" opciones={OPC_ACTIVIDAD} valor={df.nivel_actividad} onPick={(v) => updateDf({ nivel_actividad: v })} />
                        <Selector label="Objetivo" opciones={OPC_OBJETIVO} valor={df.objetivo_tipo} onPick={(v) => updateDf({ objetivo_tipo: v })} />
                        <button
                          type="button"
                          onClick={recalcular}
                          className="w-full rounded-btn py-2.5 text-sm font-semibold"
                          style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-primario)', color: 'var(--color-primario)' }}
                        >
                          Recalcular calorías
                        </button>
                        <p className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>
                          Usa la fórmula Mifflin-St Jeor. Después podés ajustar los valores a mano arriba. Se guardan al tocar “Guardar”.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={guardarObjetivos}
                      className="flex-1 rounded-btn py-2.5 text-sm font-semibold"
                      style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setObjetivo(perfil.objetivo);
                        setEditandoObjetivos(false);
                      }}
                      className="rounded-btn px-4 py-2.5 text-sm"
                      style={{ border: '1px solid var(--color-borde)' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="grid grid-cols-2 gap-2 rounded-btn p-3 text-sm"
                  style={{ background: 'var(--color-superficie-alt)' }}
                >
                  <Dato label="Calorías" valor={`${perfil.objetivo.calorias} kcal`} />
                  <Dato label="Comidas" valor={`${perfil.objetivo.comidas}`} />
                  <Dato label="Proteínas" valor={`${perfil.objetivo.proteinas} g`} />
                  <Dato label="Carbohidratos" valor={`${perfil.objetivo.carbohidratos} g`} />
                  <Dato label="Grasas" valor={`${perfil.objetivo.grasas} g`} />
                </div>
              )}
            </section>

            {/* Apariencia */}
            <section>
              <h4 className="mb-2 text-xs uppercase tracking-wide" style={{ color: 'var(--color-texto-sec)' }}>
                Apariencia
              </h4>
              <button
                onClick={toggleTema}
                className="flex w-full items-center justify-between rounded-btn px-3 py-3 text-sm"
                style={{ background: 'var(--color-superficie-alt)' }}
              >
                <span className="flex items-center gap-2">
                  {perfil.tema === 'oscuro' ? <Moon size={18} /> : <Sun size={18} />}
                  Tema {perfil.tema === 'oscuro' ? 'oscuro' : 'claro'}
                </span>
                <span style={{ color: 'var(--color-primario)' }}>Cambiar</span>
              </button>
            </section>

            {/* Mi perfil */}
            <section>
              <h4 className="mb-2 text-xs uppercase tracking-wide" style={{ color: 'var(--color-texto-sec)' }}>
                Mi perfil
              </h4>
              <div className="flex flex-col gap-2">
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre"
                  className="w-full rounded-btn px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
                />
                <input
                  value={email}
                  readOnly
                  placeholder="Email"
                  type="email"
                  title="El email es tu usuario de acceso y no se puede cambiar por ahora"
                  className="w-full rounded-btn px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto-sec)' }}
                />
                <button
                  onClick={guardarPerfil}
                  className="rounded-btn py-2.5 text-sm font-semibold"
                  style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}
                >
                  Guardar
                </button>
              </div>
            </section>

            {/* Footer */}
            <footer className="mt-2 text-center text-xs" style={{ color: 'var(--color-texto-sec)' }}>
              <p>v1.0 — Prototipo</p>
              <p>{gym.nombre} · Tucumán</p>
            </footer>
          </div>
        )}
      </aside>

      {agregarReceta && (
        <AgregarRecetaModal
          onClose={() => setAgregarReceta(false)}
          onGuardada={(r) => {
            setAgregarReceta(false);
            mostrar(`✅ Receta "${r.nombre}" guardada`);
          }}
        />
      )}
      {toast}
    </>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>{label}</div>
      <div className="font-semibold" style={{ color: 'var(--color-acento)' }}>{valor}</div>
    </div>
  );
}

function NumChico({ label, value, onChange }: {
  label: string; value: number; onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="mt-1 w-full rounded-btn px-2 py-2 text-sm outline-none"
        style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)', textAlign: 'right' }}
      />
    </label>
  );
}

function Selector<T extends string>({ label, opciones, valor, onPick }: {
  label: string;
  opciones: { val: T; label: string }[];
  valor: T;
  onPick: (v: T) => void;
}) {
  return (
    <div>
      <span className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>{label}</span>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {opciones.map((o) => {
          const activo = valor === o.val;
          return (
            <button
              key={o.val}
              type="button"
              onClick={() => onPick(o.val)}
              className="rounded-btn px-3 py-1.5 text-xs font-semibold"
              style={{
                background: activo ? 'var(--color-primario)' : 'var(--color-superficie-alt)',
                color: activo ? 'var(--color-sobre-primario)' : 'var(--color-texto)',
                border: `1px solid ${activo ? 'var(--color-primario)' : 'var(--color-borde)'}`,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
