import { NextRequest, NextResponse } from 'next/server';
import type { AlimentoBusqueda } from '@/types';
import ingredientesData from '../../../../data/ingredientes.json';

export const dynamic = 'force-dynamic';

interface IngredienteLocal {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  fibra: number;
  porcion: string;
  usda_fdcId: number;
  usda_descripcion: string;
  aproximado?: boolean;
  nota?: string;
}

const INGREDIENTES_LOCAL = ingredientesData.ingredientes as Record<string, IngredienteLocal>;

/** Quita acentos y pasa a minúsculas para poder comparar "pollo" con "Pollo" o "azúcar" con "azucar". */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Busca en la base curada de ingredientes (data/ingredientes.json) por coincidencia
 * parcial en español. Esta base tiene macros REALES tomados de USDA (ver usda_fdcId
 * en cada entrada para auditar la fuente), no valores generados por IA.
 */
function buscarLocal(query: string): AlimentoBusqueda[] {
  const q = normalizar(query);
  if (!q) return [];
  const resultados: AlimentoBusqueda[] = [];
  for (const [nombre, datos] of Object.entries(INGREDIENTES_LOCAL)) {
    const nombreNorm = normalizar(nombre);
    if (nombreNorm.includes(q) || q.includes(nombreNorm)) {
      resultados.push({
        fuente: 'usda',
        id: `local-${nombreNorm.replace(/\s+/g, '-')}`,
        nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
        calorias: datos.calorias,
        proteinas: datos.proteinas,
        carbohidratos: datos.carbohidratos,
        grasas: datos.grasas,
        fibra: datos.fibra,
        porcion: datos.porcion,
      });
    }
  }
  return resultados;
}

const NUTR = { kcal: 1008, prot: 1003, carbs: 1005, grasas: 1004, fibra: 1079 };

async function fetchConTimeout(url: string, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Normaliza un alimento de la API de USDA (valores ya por 100g). */
function normalizarUSDA(food: any): AlimentoBusqueda {
  const get = (id: number) =>
    food.foodNutrients?.find((n: any) => n.nutrientId === id)?.value ?? 0;
  const pos = (n: number) => Math.max(0, +(+n).toFixed(1)); // clamp negativos a 0

  const proteinas = pos(get(NUTR.prot));
  const carbohidratos = pos(get(NUTR.carbs));
  const grasas = pos(get(NUTR.grasas));
  let calorias = Math.round(get(NUTR.kcal));
  // Algunos alimentos USDA traen macros pero no energía: la estimamos (Atwater).
  if (calorias <= 0) calorias = Math.round(proteinas * 4 + carbohidratos * 4 + grasas * 9);

  return {
    fuente: 'usda',
    id: `usda-${food.fdcId}`,
    nombre: food.description ?? 'Alimento',
    calorias,
    proteinas,
    carbohidratos,
    grasas,
    fibra: pos(get(NUTR.fibra)),
    porcion: '100 g',
  };
}

/** Normaliza un producto de Open Food Facts (campos *_100g). */
function normalizarOFF(p: any): AlimentoBusqueda | null {
  const n = p.nutriments;
  if (!n || !p.product_name) return null;
  return {
    fuente: 'openfoodfacts',
    id: `off-${p.code ?? p.id ?? p.product_name.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`,
    nombre: p.product_name,
    calorias: Math.round(n['energy-kcal_100g'] ?? 0),
    proteinas: +(+(n.proteins_100g ?? 0)).toFixed(1),
    carbohidratos: +(+(n.carbohydrates_100g ?? 0)).toFixed(1),
    grasas: +(+(n.fat_100g ?? 0)).toFixed(1),
    fibra: +(+(n.fiber_100g ?? 0)).toFixed(1),
    porcion: '100 g',
  };
}

/** GET /api/buscar?query= → alimentos normalizados por 100g (USDA + Open Food Facts). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('query') ?? '').trim();
  if (!query) return NextResponse.json([]);

  // --- Base curada en español (siempre primero, son macros reales ya verificados) ---
  const resultados: AlimentoBusqueda[] = buscarLocal(query);
  const idsLocales = new Set(resultados.map((r) => r.nombre.toLowerCase()));

  // --- USDA (solo si la base local no alcanzó para dar variedad) ---
  const key = process.env.USDA_API_KEY;
  if (resultados.length < 3 && key && key !== 'TU_API_KEY_AQUI') {
    try {
      const url =
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}` +
        `&api_key=${key}&pageSize=8&dataType=${encodeURIComponent('Foundation,SR Legacy')}`;
      const res = await fetchConTimeout(url);
      if (res.ok) {
        const data = await res.json();
        for (const f of data.foods ?? []) {
          const norm = normalizarUSDA(f);
          // Algunos alimentos "Foundation" vienen sin nutrientes en la búsqueda:
          // descartamos los que no tienen datos útiles.
          if (norm.calorias > 0 || norm.proteinas > 0) resultados.push(norm);
        }
      }
    } catch {
      /* USDA no disponible: seguimos con lo que haya. */
    }
  }

  // --- Open Food Facts (siempre que USDA devuelva pocos resultados) ---
  if (resultados.length < 4) {
    try {
      const url =
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
        `&json=true&page_size=5`;
      const res = await fetchConTimeout(url);
      if (res.ok) {
        const data = await res.json();
        for (const p of data.products ?? []) {
          const norm = normalizarOFF(p);
          if (norm && norm.calorias > 0) resultados.push(norm);
        }
      }
    } catch {
      /* OFF no disponible. */
    }
  }

  return NextResponse.json(resultados);
}
