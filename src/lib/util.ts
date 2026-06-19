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

// --- Escalado de cantidades de ingredientes al ajuste de porción del plan ---

const FRAC_UNICODE: Record<string, number> = {
  '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125,
};
// g/ml/etc: se redondean a número entero.
const UNIDADES_METRICAS_ENTERAS = new Set(['g', 'gr', 'grs', 'gramo', 'gramos', 'mg', 'ml', 'cc']);
// kg/l: admiten decimales.
const UNIDADES_METRICAS_DECIMALES = new Set(['kg', 'kgs', 'kilo', 'kilos', 'l', 'lt', 'litro', 'litros']);
const UNIDADES_ONZA = new Set(['oz', 'onza', 'onzas']);
// Cucharadas, cucharaditas y tazas: se redondean a ¼.
const UNIDADES_CUCHARA = new Set([
  'cda', 'cdas', 'cucharada', 'cucharadas',
  'cdita', 'cditas', 'cucharadita', 'cucharaditas',
  'taza', 'tazas', 'tacita', 'tacitas',
]);
// Cantidades vagas que no tiene sentido escalar.
const UNIDADES_NO_ESCALABLES = new Set(['pizca', 'pizcas', 'puñado', 'puñados', 'punado']);

type BucketUnidad = 'metrica_entera' | 'metrica_decimal' | 'onza' | 'cuchara' | 'conteo';

/** Interpreta la cantidad inicial (entero, decimal con coma/punto, fracción a/b o unicode, o mixto). */
function parseCantidad(raw: string): number | null {
  const t = raw.trim();
  let m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/); // "1 1/2"
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = t.match(/^(\d+)\s*([½¼¾⅓⅔⅛])$/); // "1½"
  if (m) return Number(m[1]) + FRAC_UNICODE[m[2]];
  m = t.match(/^(\d+)\/(\d+)$/); // "1/2"
  if (m) return Number(m[1]) / Number(m[2]);
  const fu = FRAC_UNICODE[t]; // "½"
  if (fu !== undefined) return fu;
  const n = parseFloat(t.replace(',', '.')); // "200" o "1,5"
  return Number.isFinite(n) ? n : null;
}

function bucketDeUnidad(unidad: string): BucketUnidad {
  if (UNIDADES_METRICAS_ENTERAS.has(unidad)) return 'metrica_entera';
  if (UNIDADES_METRICAS_DECIMALES.has(unidad)) return 'metrica_decimal';
  if (UNIDADES_ONZA.has(unidad)) return 'onza';
  if (UNIDADES_CUCHARA.has(unidad)) return 'cuchara';
  return 'conteo';
}

function redondearCantidad(v: number, bucket: BucketUnidad): number {
  switch (bucket) {
    case 'metrica_entera': return Math.max(1, Math.round(v));
    case 'metrica_decimal': return Math.max(0.05, +v.toFixed(2));
    case 'onza': return Math.max(0.1, +v.toFixed(1));
    case 'cuchara': return Math.max(0.25, Math.round(v * 4) / 4);
    case 'conteo': return Math.max(0.5, Math.round(v * 2) / 2);
  }
}

/** Renderiza una cantidad usando fracciones legibles (½, ¼, ¾) cuando corresponde. */
function renderCantidad(v: number): string {
  const entero = Math.floor(v + 1e-9);
  const frac = +(v - entero).toFixed(2);
  const simbolos: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  if (frac === 0) return String(entero);
  const simbolo = simbolos[frac];
  if (simbolo) return entero === 0 ? simbolo : `${entero}${simbolo}`;
  return String(v).replace('.', ',');
}

/**
 * Escala la cantidad inicial de una línea de ingrediente por el factor de porción del plan.
 *
 * Reglas:
 * - g/ml redondean a entero; cucharadas/tazas a ¼; conteos (huevos, morrón…) a ½.
 * - No toca condimentos sin cantidad ("sal y pimienta", "ajo", "canela a gusto")
 *   ni números que no estén al principio de la línea ("jugo de 1 limón").
 * - Si el factor es ~1 (o no es válido), devuelve el texto sin cambios.
 */
export function escalarIngrediente(texto: string, factor: number): string {
  if (!texto || !Number.isFinite(factor) || Math.abs(factor - 1) < 0.01) return texto;
  const m = texto.match(
    /^(\s*)(\d+\s+\d+\/\d+|\d+\s*[½¼¾⅓⅔⅛]|\d+\/\d+|[½¼¾⅓⅔⅛]|\d+(?:[.,]\d+)?)(\s*)(.*)$/,
  );
  if (!m) return texto;
  const pre = m[1];
  const cantidadRaw = m[2];
  const sep = m[3];
  const resto = m[4];
  const valor = parseCantidad(cantidadRaw);
  if (valor === null || valor <= 0) return texto;
  const unidadMatch = resto.match(/^([a-záéíóúñ]+)/i);
  const unidad = unidadMatch ? unidadMatch[1].toLowerCase() : '';
  if (UNIDADES_NO_ESCALABLES.has(unidad)) return texto;
  const escalado = redondearCantidad(valor * factor, bucketDeUnidad(unidad));
  return `${pre}${renderCantidad(escalado)}${sep}${resto}`;
}
