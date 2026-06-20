'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { NivelActividad, ObjetivoTipo, Sexo } from '@/types';
import { clearUserLocal } from '@/lib/usuario';
import { useGymConfig } from '@/lib/useGymConfig';
import type { Objetivo } from '@/components/ObjetivosFields';
import { calcularTDEE, OPC_SEXO, OPC_ACTIVIDAD, OPC_OBJETIVO } from '@/lib/calorias';

// calcularTDEE, los factores y las opciones viven en @/lib/calorias (reutilizables en el menú).

export default function OnboardingPage() {
  const router = useRouter();
  const gym = useGymConfig();
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [edad, setEdad] = useState('');
  const [sexo, setSexo] = useState<Sexo>('masculino');
  const [actividad, setActividad] = useState<NivelActividad>('moderado');
  const [objetivoTipo, setObjetivoTipo] = useState<ObjetivoTipo>('mantener');
  const [calculado, setCalculado] = useState(false);
  const [objetivo, setObjetivo] = useState<Objetivo>({
    calorias: 2000,
    proteinas: 150,
    carbohidratos: 200,
    grasas: 65,
    comidas: 3,
  });

  const datosCompletos =
    peso !== '' && altura !== '' && edad !== '' &&
    Number(peso) > 0 && Number(altura) > 0 && Number(edad) > 0;

  const handleCalcular = () => {
    setObjetivo(calcularTDEE(Number(peso), Number(altura), Number(edad), sexo, actividad, objetivoTipo));
    setCalculado(true);
  };

  const [guardando, setGuardando] = useState(false);
  const [errorReg, setErrorReg] = useState('');

  const finalizar = async () => {
    if (guardando) return;
    // Email + contraseña son obligatorios: la cuenta vive en la DB y el middleware
    // exige la cookie de sesión para entrar a la app.
    if (!email.trim() || password.length < 6) {
      setErrorReg('Necesitás un email y una contraseña de al menos 6 caracteres.');
      setPaso(2);
      return;
    }
    setGuardando(true);
    setErrorReg('');

    const datos_fisicos = datosCompletos
      ? { peso: Number(peso), altura: Number(altura), edad: Number(edad), sexo, nivel_actividad: actividad, objetivo_tipo: objetivoTipo }
      : undefined;

    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim() || 'Atleta',
          email: email.trim(),
          password,
          objetivo,
          datos_fisicos,
        }),
      });
      if (res.ok) {
        // La cuenta y la cookie de sesión ya quedaron creadas por el endpoint.
        clearUserLocal();
        router.replace('/plan');
        return;
      }
      if (res.status === 409) {
        setErrorReg('Ya existe una cuenta con ese email. Te llevamos a iniciar sesión…');
        setTimeout(() => router.replace('/login'), 1200);
        return;
      }
      const err = await res.json().catch(() => ({}));
      setErrorReg(err.error ?? 'No pudimos crear tu cuenta. Probá de nuevo.');
      setGuardando(false);
    } catch {
      setErrorReg('Sin conexión. Revisá tu internet e intentá de nuevo.');
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col" style={{ paddingBottom: 0 }}>
      <div className="flex gap-1.5 p-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: n <= paso ? 'var(--color-primario)' : 'var(--color-borde)' }} />
        ))}
      </div>

      <div key={paso} className="animar-slide flex-1 px-4 pb-8 flex flex-col">

        {paso === 1 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gym.logo} alt={gym.nombre} className="h-24 w-24 rounded-card object-cover"
              style={{ background: 'var(--color-superficie)' }}
              onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} />
            <h1 className="text-3xl font-extrabold">{gym.nombre}</h1>
            <p className="font-medium" style={{ color: 'var(--color-primario)' }}>{gym.tagline}</p>
            <p className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>Tu plan de nutricion personalizado</p>
            <Boton onClick={() => setPaso(2)}>Empezar</Boton>
            <button type="button" onClick={() => router.push('/login')}
              className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
              Ya tengo cuenta · <span style={{ color: 'var(--color-primario)', fontWeight: 600 }}>Iniciar sesión</span>
            </button>
          </div>
        )}

        {paso === 2 && (
          <div className="flex-1 flex flex-col gap-4">
            <Titulo>Tu perfil</Titulo>
            <Campo label="Nombre completo">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Perez" className="input-base" />
            </Campo>
            <Campo label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@email.com" autoComplete="email" className="input-base" />
            </Campo>
            <Campo label="Contraseña">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" autoComplete="new-password" className="input-base" />
            </Campo>
            <div className="mt-auto">
              <Boton onClick={() => setPaso(3)}
                disabled={!nombre.trim() || !email.trim() || password.length < 6}>Continuar</Boton>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="flex-1 flex flex-col gap-4" style={{ overflowY: 'auto' }}>
            <Titulo>Calcula tus calorias</Titulo>
            <p className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>
              Completa tus datos y calculamos tu objetivo automaticamente.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Peso (kg)">
                <input type="number" inputMode="decimal" value={peso}
                  onChange={(e) => { setPeso(e.target.value); setCalculado(false); }}
                  placeholder="70" className="input-base" />
              </Campo>
              <Campo label="Altura (cm)">
                <input type="number" inputMode="decimal" value={altura}
                  onChange={(e) => { setAltura(e.target.value); setCalculado(false); }}
                  placeholder="170" className="input-base" />
              </Campo>
            </div>
            <Campo label="Edad">
              <input type="number" inputMode="numeric" value={edad}
                onChange={(e) => { setEdad(e.target.value); setCalculado(false); }}
                placeholder="25" className="input-base" />
            </Campo>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>Sexo</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {OPC_SEXO.map(({ val, label }) => (
                  <BtnSel key={val} activo={sexo === val}
                    onClick={() => { setSexo(val); setCalculado(false); }}>{label}</BtnSel>
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>Nivel de actividad</span>
              <div className="mt-2 flex flex-col gap-2">
                {OPC_ACTIVIDAD.map(({ val, label, sub }) => (
                  <button key={val} type="button"
                    onClick={() => { setActividad(val); setCalculado(false); }}
                    className="text-left rounded-btn px-3 py-2.5 transition-colors"
                    style={{
                      background: actividad === val ? 'var(--color-primario)' : 'var(--color-superficie-alt)',
                      color: actividad === val ? 'var(--color-sobre-primario)' : 'var(--color-texto)',
                      border: '1px solid ' + (actividad === val ? 'var(--color-primario)' : 'var(--color-borde)'),
                    }}>
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs" style={{
                      color: actividad === val ? 'var(--color-sobre-primario)' : 'var(--color-texto-sec)',
                      opacity: 0.85,
                    }}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>Objetivo</span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {OPC_OBJETIVO.map(({ val, label }) => (
                  <BtnSel key={val} activo={objetivoTipo === val}
                    onClick={() => { setObjetivoTipo(val); setCalculado(false); }}>{label}</BtnSel>
                ))}
              </div>
            </div>
            <button type="button" onClick={handleCalcular} disabled={!datosCompletos}
              className="w-full rounded-btn py-3 text-sm font-semibold transition-opacity disabled:opacity-40"
              style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-primario)', color: 'var(--color-primario)' }}>
              Calcular mis calorias
            </button>
            {calculado && (
              <div className="rounded-card p-4 flex flex-col gap-3"
                style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-primario)' }}>
                  Resultado - podes editarlo si queres
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <CampoNum label="Calorias (kcal)" value={objetivo.calorias} min={1000} max={6000}
                    onChange={(v) => setObjetivo((p) => ({ ...p, calorias: v }))} />
                  <CampoNum label="Proteinas (g)" value={objetivo.proteinas} min={30} max={400}
                    onChange={(v) => setObjetivo((p) => ({ ...p, proteinas: v }))} />
                  <CampoNum label="Carbohidratos (g)" value={objetivo.carbohidratos} min={30} max={600}
                    onChange={(v) => setObjetivo((p) => ({ ...p, carbohidratos: v }))} />
                  <CampoNum label="Grasas (g)" value={objetivo.grasas} min={20} max={300}
                    onChange={(v) => setObjetivo((p) => ({ ...p, grasas: v }))} />
                </div>
                <div>
                  <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>Numero de comidas</span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {([3, 4] as const).map((n) => (
                      <BtnSel key={n} activo={objetivo.comidas === n}
                        onClick={() => setObjetivo((p) => ({ ...p, comidas: n }))}>{n} comidas</BtnSel>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-auto pt-4">
              <Boton onClick={() => setPaso(4)} disabled={!calculado}>Continuar</Boton>
            </div>
          </div>
        )}

        {paso === 4 && (
          <div className="flex-1 flex flex-col gap-4">
            <Titulo>Todo listo, {nombre.trim() || 'Atleta'}!</Titulo>
            <p style={{ color: 'var(--color-texto-sec)' }}>Tus objetivos diarios:</p>
            <div className="grid grid-cols-2 gap-3 rounded-card p-4" style={{ background: 'var(--color-superficie)' }}>
              <Resumen label="Calorias" valor={objetivo.calorias + ' kcal'} />
              <Resumen label="Comidas/dia" valor={String(objetivo.comidas)} />
              <Resumen label="Proteinas" valor={objetivo.proteinas + ' g'} />
              <Resumen label="Carbohidratos" valor={objetivo.carbohidratos + ' g'} />
              <Resumen label="Grasas" valor={objetivo.grasas + ' g'} />
            </div>
            {errorReg && (
              <p className="text-sm text-center" style={{ color: 'var(--color-error)' }}>{errorReg}</p>
            )}
            <div className="mt-auto pt-4">
              <p className="text-[11px] leading-snug text-center px-1 mb-3" style={{ color: 'var(--color-texto-sec)' }}>
                Al crear tu cuenta aceptás que esta app brinda <strong>orientación nutricional general</strong> y no
                reemplaza el consejo de un profesional de la salud. Tus datos se usan únicamente para generar tu
                plan (Ley 25.326 de Protección de Datos Personales).
              </p>
              <Boton onClick={finalizar} disabled={guardando}>
                {guardando ? 'Creando tu cuenta…' : 'Ver mi plan de hoy'}
              </Boton>
            </div>
          </div>
        )}

      </div>

      <style jsx global>{`
        .input-base {
          width: 100%;
          border-radius: var(--radio-btn);
          padding: 0.75rem;
          font-size: 1rem;
          outline: none;
          background: var(--color-superficie-alt);
          border: 1px solid var(--color-borde);
          color: var(--color-texto);
        }
      `}</style>
    </main>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold mb-1">{children}</h2>;
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm" style={{ color: 'var(--color-texto-sec)' }}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function CampoNum({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>{label}</span>
      <input type="number" inputMode="numeric" value={value === 0 ? '' : value} min={min} max={max}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        onBlur={(e) => { if (!e.target.value || Number(e.target.value) === 0) onChange(min); }}
        className="mt-1 w-full rounded-btn px-3 py-2 text-base outline-none"
        style={{ background: 'var(--color-superficie-alt)', border: '1px solid var(--color-borde)', color: 'var(--color-texto)', textAlign: 'right' }} />
    </label>
  );
}

function BtnSel({ children, activo, onClick }: {
  children: React.ReactNode; activo: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-btn py-2.5 text-sm font-semibold transition-colors"
      style={{
        background: activo ? 'var(--color-primario)' : 'var(--color-superficie-alt)',
        color: activo ? 'var(--color-sobre-primario)' : 'var(--color-texto)',
        border: '1px solid ' + (activo ? 'var(--color-primario)' : 'var(--color-borde)'),
      }}>
      {children}
    </button>
  );
}

function Resumen({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--color-texto-sec)' }}>{label}</div>
      <div className="text-lg font-bold" style={{ color: 'var(--color-acento)' }}>{valor}</div>
    </div>
  );
}

function Boton({ children, onClick, disabled }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full inline-flex items-center justify-center gap-1 rounded-btn py-3.5 text-base font-semibold transition-opacity disabled:opacity-40"
      style={{ background: 'var(--color-primario)', color: 'var(--color-sobre-primario)' }}>
      {children} <ChevronRight size={18} />
    </button>
  );
}
