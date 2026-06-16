'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ClipboardList, Search, Pencil, Sun, Moon, ChefHat } from 'lucide-react';
import type { UserProfile } from '@/types';
import { getUserAsync, saveUser, aplicarTema } from '@/lib/usuario';
import { useGymConfig } from '@/lib/useGymConfig';
import ObjetivosFields, { Objetivo } from './ObjetivosFields';
import AgregarRecetaModal from './AgregarRecetaModal';
import { useToast } from './Toast';

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
          setNombre(u.nombre);
          setEmail(u.email);
        }
        setEditandoObjetivos(false);
      })();
      return () => {
        cancelado = true;
      };
    }
  }, [abierto]);

  const persistir = (cambios: Partial<UserProfile>) => {
    if (!perfil) return;
    const nuevo: UserProfile = { ...perfil, ...cambios };
    saveUser(nuevo);
    setPerfil(nuevo);
    onPerfilActualizado?.(nuevo);
    return nuevo;
  };

  const guardarObjetivos = () => {
    if (!objetivo) return;
    persistir({ objetivo });
    setEditandoObjetivos(false);
    mostrar('✅ Objetivos actualizados');
  };

  const toggleTema = () => {
    if (!perfil) return;
    const nuevoTema = perfil.tema === 'oscuro' ? 'claro' : 'oscuro';
    aplicarTema(nuevoTema);
    persistir({ tema: nuevoTema });
  };

  const guardarPerfil = () => {
    persistir({ nombre, email });
    mostrar('✅ Perfil actualizado');
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
                  <Search size={18} style={{ color: 'var(--color-primario)' }} /> Buscar macros
                </button>
                <button
                  onClick={() => setAgregarReceta(true)}
                  className="flex items-center gap-3 rounded-btn px-3 py-3 text-left text-sm"
                  style={{ background: 'var(--color-superficie-alt)' }}
                >
                  <ChefHat size={18} style={{ color: 'var(--color-primario)' }} /> Agregar mi receta
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="w-full rounded-btn px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)' }}
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
