'use client';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGymConfig } from '@/lib/useGymConfig';

export default function LegalPage() {
  const router = useRouter();
  const gym = useGymConfig();

  return (
    <main className="min-h-screen" style={{ background: 'var(--color-fondo)', color: 'var(--color-texto)' }}>
      <header
        className="sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3.5"
        style={{ background: 'var(--color-fondo)', borderColor: 'var(--color-borde)' }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          className="flex h-9 w-9 items-center justify-center rounded-btn"
          style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-semibold">Términos y privacidad</h1>
      </header>

      <article className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-6 text-sm leading-relaxed">
        <p style={{ color: 'var(--color-texto-sec)' }}>
          Última actualización: junio de 2026. Este documento explica en lenguaje claro qué es esta app, cómo
          usamos tus datos y cuáles son tus derechos.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-primario)' }}>
            1. Qué es este servicio
          </h2>
          <p>
            {gym.nombre} te ofrece esta app de nutrición como un beneficio para sus socios. La app genera planes de
            comidas y estima calorías y macronutrientes con fines <strong>informativos y de orientación general</strong>.
          </p>
          <p
            className="rounded-card p-3"
            style={{ background: 'var(--color-superficie)', border: '1px solid var(--color-borde)' }}
          >
            <strong>No es consejo médico.</strong> La información que ves no reemplaza la consulta con un médico,
            nutricionista u otro profesional de la salud. Si tenés una condición de salud, alergias, estás
            embarazada o tomás medicación, consultá a un profesional antes de seguir cualquier plan. Ante una
            urgencia, comunicate con tu servicio de emergencias.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-primario)' }}>
            2. Qué datos recopilamos
          </h2>
          <p>Para que la app funcione, guardamos:</p>
          <ul className="ml-5 list-disc flex flex-col gap-1">
            <li>Tu nombre y email (para crear y acceder a tu cuenta).</li>
            <li>Tu contraseña, guardada siempre cifrada (hasheada); nunca en texto plano.</li>
            <li>
              De forma opcional, los datos que cargás para calcular tus calorías: peso, altura, edad, sexo, nivel
              de actividad y objetivo.
            </li>
            <li>La actividad dentro de la app: planes generados y comidas registradas.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-primario)' }}>
            3. Para qué los usamos
          </h2>
          <p>
            Usamos tus datos <strong>únicamente</strong> para generar y mostrar tu plan personalizado, calcular tus
            objetivos y permitirte acceder a tu cuenta. {gym.nombre}, como responsable del servicio, puede ver
            métricas de uso de sus socios (por ejemplo, cuántos están activos). <strong>No vendemos tus datos</strong>{' '}
            ni los compartimos con terceros ajenos al servicio con fines publicitarios.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-primario)' }}>
            4. Tus derechos (Ley 25.326)
          </h2>
          <p>
            En Argentina, la Ley 25.326 de Protección de Datos Personales te garantiza el derecho a acceder a tus
            datos, rectificarlos, actualizarlos y solicitar su supresión. Para ejercer cualquiera de estos derechos,
            contactá a {gym.nombre}, que es el responsable del tratamiento de tus datos. La Agencia de Acceso a la
            Información Pública es el organismo de control y atiende las denuncias por incumplimiento.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-primario)' }}>
            5. Conservación y seguridad
          </h2>
          <p>
            Conservamos tus datos mientras tu cuenta esté activa. Tu sesión se mantiene mediante una cookie segura y
            tu contraseña se almacena cifrada. Si querés dar de baja tu cuenta y eliminar tus datos, pedíselo a{' '}
            {gym.nombre}.
          </p>
        </section>

        <p className="pt-2 text-xs" style={{ color: 'var(--color-texto-sec)' }}>
          Este texto es una guía orientativa y no constituye asesoramiento legal. {gym.nombre} puede adaptarlo a su
          realidad y consultar a un profesional para su versión definitiva.
        </p>
      </article>
    </main>
  );
}
