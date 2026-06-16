import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Mapeo de las CSS variables del gym a clases de Tailwind.
        primario: 'var(--color-primario)',
        acento: 'var(--color-acento)',
        fondo: 'var(--color-fondo)',
        superficie: 'var(--color-superficie)',
        'superficie-alt': 'var(--color-superficie-alt)',
        texto: 'var(--color-texto)',
        'texto-sec': 'var(--color-texto-sec)',
        borde: 'var(--color-borde)',
        exito: 'var(--color-exito)',
        error: 'var(--color-error)',
      },
      borderRadius: {
        card: 'var(--radio-card)',
        btn: 'var(--radio-btn)',
      },
    },
  },
  plugins: [],
};

export default config;
