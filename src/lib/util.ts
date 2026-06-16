import type { MacroTotales, Receta, TipoComida } from '@/types';

export interface SlotMeta {
  value: TipoComida;
  label: string;
  hora: string;
}

const SLOT_META: Record<TipoComida, SlotMeta> = {
  desayuno: { value: 'desayuno', label: 'Desayuno', hora: '7-9h' },
  almuerzo: { value: 'almuerzo', label: 'Almuerzo', hora: '12-14h' },
  merienda: { value: 'merienda', label: 'Merienda', hora: '16-18h' },
  cena: { value: 'cena', label: 'Cena', hora: '20-22h' },
};

/** Slots del día (con label y hora) según el número de comidas. */
export function slotsDe(comidas: number): SlotMeta[] {
  const orden: TipoComida[] =
    comidas === 4
      ? ['desayuno', 'almuerzo', 'merienda', 'cena']
      : ['desayuno', 'almuerzo', 'cena'];
  return orden.map((s) => SLOT_META[s]);
}

export function labelSlot(slot: TipoComida): string {
  return SLOT_META[slot]?.label ?? slot;
}

/** Devuelve la fecha local en formato YYYY-MM-DD (clave usada en la DB). */
export function fechaHoy(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** "Lunes 14 de Junio" a partir de una fecha. */
export function fechaLarga(d: Date = new Date()): string {
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/**
 * Color de un macro según el porcentaje consumido respecto al objetivo.
 * Umbrales del spec: < 85% éxito (verde), 85-100% naranja, > 100% error (rojo).
 */
export function colorPorcentaje(consumido: number, objetivo: number): string {
  if (objetivo <= 0) return 'var(--color-texto-sec)';
  const pct = (consumido / objetivo) * 100;
  if (pct > 100) return 'var(--color-error)';
  if (pct >= 85) return '#F97316';
  return 'var(--color-exito)';
}

/** Variante para los chips del header del plan (verde <90, naranja 90-100, rojo >100). */
export function colorChip(consumido: number, objetivo: number): string {
  if (objetivo <= 0) return 'var(--color-texto-sec)';
  const pct = (consumido / objetivo) * 100;
  if (pct > 100) return 'var(--color-error)';
  if (pct >= 90) return '#F97316';
  return 'var(--color-exito)';
}

export function macrosVacios(): MacroTotales {
  return { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 };
}

/** Suma los macros de una lista de objetos con campos de macros. */
export function sumarMacros(items: Partial<MacroTotales>[]): MacroTotales {
  return items.reduce<MacroTotales>(
    (acc, x) => ({
      calorias: acc.calorias + (x.calorias ?? 0),
      proteinas: acc.proteinas + (x.proteinas ?? 0),
      carbohidratos: acc.carbohidratos + (x.carbohidratos ?? 0),
      grasas: acc.grasas + (x.grasas ?? 0),
    }),
    macrosVacios()
  );
}

/** Escala los macros de un alimento "por 100g" a la cantidad indicada. */
export function escalarPorGramos(
  base: { calorias: number; proteinas: number; carbohidratos: number; grasas: number; fibra?: number },
  gramos: number
) {
  const f = gramos / 100;
  return {
    calorias: Math.round(base.calorias * f),
    proteinas: +(base.proteinas * f).toFixed(1),
    carbohidratos: +(base.carbohidratos * f).toFixed(1),
    grasas: +(base.grasas * f).toFixed(1),
    fibra: +((base.fibra ?? 0) * f).toFixed(1),
  };
}

/** ¿La receta proviene de un dataset argentino / receta local? */
export function esLocal(r: Pick<Receta, 'origen'>): boolean {
  return /argentin|local/i.test(r.origen ?? '');
}
