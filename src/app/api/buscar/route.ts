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

async function fetchConTimeout(url: string, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Normaliza un producto de Open Food Facts (campos *_100g). */
function normalizarOFF(p: any): AlimentoBusqueda | null {
  const n = p.nutriments;
  if (!n || !p.product_name) return null;
  return {
    fuente: 'openfoodfacts',
    id: `off-${p.code ?? p.id ?? p.product_name.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`,
    nombre: p.product_name_es || p.product_name,
    calorias: Math.round(n['energy-kcal_100g'] ?? 0),
    proteinas: +(+(n.proteins_100g ?? 0)).toFixed(1),
    carbohidratos: +(+(n.carbohydrates_100g ?? 0)).toFixed(1),
    grasas: +(+(n.fat_100g ?? 0)).toFixed(1),
    fibra: +(+(n.fiber_100g ?? 0)).toFixed(1),
    porcion: '100 g',
  };
}

/** GET /api/buscar?query= → alimentos normalizados por 100g (base curada en español + Open Food Facts). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('query') ?? '').trim();
  if (!query) return NextResponse.json([]);

  // --- Base curada en español (primero: macros reales ya verificados) ---
  const resultados: AlimentoBusqueda[] = buscarLocal(query);

  // --- Open Food Facts en español (cubre lo que no esté en la base curada) ---
  if (resultados.length < 6) {
    try {
      const url =
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
        `&json=true&page_size=10&lc=es`;
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
