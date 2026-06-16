import type { Metadata, Viewport } from 'next';
import { getGymConfig } from '@/lib/gymConfig';
import { Inter } from 'next/font/google';
import RegisterSW from '@/components/RegisterSW';
import ThemeInit from '@/components/ThemeInit';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const { gym } = getGymConfig();

export const metadata: Metadata = {
  title: gym.nombre,
  description: gym.tagline,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: gym.nombre,
  },
};

export const viewport: Viewport = {
  themeColor: gym.colores.primario,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { colores } = gym;

  const cssVars = {
    '--color-primario': colores.primario,
    '--color-acento': colores.acento,
    '--color-fondo': colores.fondo,
    '--color-superficie': colores.superficie,
    '--color-superficie-alt': colores.superficieAlt,
    '--color-texto': colores.texto,
    '--color-texto-sec': colores.textoSecundario,
    '--color-borde': colores.borde,
    '--color-exito': colores.exito,
    '--color-error': colores.error,
    // Si el gym define un color de texto sobre primario, se usa; si no, queda
    // el default de globals.css (#0A0A0A negro, legible sobre el amarillo).
    ...(colores.sobrePrimario ? { '--color-sobre-primario': colores.sobrePrimario } : {}),
  } as React.CSSProperties;

  return (
    // Las CSS variables del gym van en <html> (no en <body>): así la clase
    // `.tema-claro` aplicada al <body> puede sobrescribir los colores temáticos.
    <html lang="es" style={cssVars}>
      <body className={inter.className}>
        <ThemeInit />
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
