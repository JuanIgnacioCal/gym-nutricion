import type { NivelActividad, ObjetivoTipo, Sexo, UserProfile } from '@/types';

/** Objetivo nutricional diario (mismo shape que UserProfile['objetivo']). */
export type Objetivo = UserProfile['objetivo'];

/** Multiplicadores de gasto según nivel de actividad (sobre la TMB). */
export const FACTORES_ACTIVIDAD: Record<NivelActividad, number> = {
  sedentario: 1.2,
  moderado: 1.375,
  activo: 1.55,
  muy_activo: 1.725,
};

/** Ajuste sobre el TDEE según el objetivo: bajar −20%, mantener, subir +10%. */
export const FACTORES_OBJETIVO: Record<ObjetivoTipo, number> = {
  bajar: 0.8,
  mantener: 1.0,
  subir: 1.1,
};

export const OPC_SEXO: { val: Sexo; label: string }[] = [
  { val: 'masculino', label: 'Masculino' },
  { val: 'femenino', label: 'Femenino' },
];

export const OPC_ACTIVIDAD: { val: NivelActividad; label: string; sub: string }[] = [
  { val: 'sedentario', label: 'Sedentario', sub: 'Poco o nada de ejercicio' },
  { val: 'moderado', label: 'Moderado', sub: '2-3 dias/semana' },
  { val: 'activo', label: 'Activo', sub: '4-5 dias/semana' },
  { val: 'muy_activo', label: 'Muy activo', sub: '6-7 dias/semana o trabajo fisico' },
];

export const OPC_OBJETIVO: { val: ObjetivoTipo; label: string }[] = [
  { val: 'bajar', label: 'Bajar peso' },
  { val: 'mantener', label: 'Mantener' },
  { val: 'subir', label: 'Ganar masa' },
];

/**
 * Calcula el objetivo calórico y de macros con la fórmula Mifflin-St Jeor.
 * TMB × factor de actividad × factor de objetivo. Macros sugeridos: 30% proteína,
 * 40% carbohidratos, 30% grasas. `comidas` se conserva (default 3).
 */
export function calcularTDEE(
  peso: number,
  altura: number,
  edad: number,
  sexo: Sexo,
  actividad: NivelActividad,
  objetivoTipo: ObjetivoTipo,
  comidas: 3 | 4 = 3,
): Objetivo {
  const tmb =
    sexo === 'masculino'
      ? 10 * peso + 6.25 * altura - 5 * edad + 5
      : 10 * peso + 6.25 * altura - 5 * edad - 161;
  const tdee = Math.round(tmb * FACTORES_ACTIVIDAD[actividad] * FACTORES_OBJETIVO[objetivoTipo]);
  return {
    calorias: tdee,
    proteinas: Math.round((tdee * 0.3) / 4),
    carbohidratos: Math.round((tdee * 0.4) / 4),
    grasas: Math.round((tdee * 0.3) / 9),
    comidas,
  };
}
