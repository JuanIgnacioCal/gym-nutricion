import type Database from 'better-sqlite3';

interface Reemplazo {
  nombre: string;
  nombre_original: string;
  tipo_comida: string;
  categoria: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  fibra: number;
  tiempo_preparacion: number;
  tiempo_coccion: number;
  tiempo_total: number;
  ingredientes: string[];
}

/**
 * Recetas con ingredientes difíciles de conseguir en Argentina, reemplazadas por
 * equivalentes locales. La clave es el nombre EXACTO de la receta a reemplazar.
 * Macros aproximados por porción.
 */
const REEMPLAZOS: Record<string, Reemplazo> = {
  'Linguine con almejas': {
    nombre: 'Fideos con salsa de tomate y atún',
    nombre_original: 'Fideos con salsa de tomate y atún',
    tipo_comida: 'almuerzo/cena',
    categoria: 'alta_proteina',
    calorias: 450,
    proteinas: 28,
    carbohidratos: 65,
    grasas: 8,
    fibra: 4,
    tiempo_preparacion: 10,
    tiempo_coccion: 20,
    tiempo_total: 30,
    ingredientes: [
      '200g fideos secos',
      '1 lata de atún al natural',
      '400g salsa de tomate',
      '1 cebolla',
      '2 dientes de ajo',
      'aceite de oliva',
      'sal y pimienta a gusto',
    ],
  },
  'Costillar de cordero con costra de pistachos': {
    nombre: 'Costillar de cerdo al horno',
    nombre_original: 'Costillar de cerdo al horno',
    tipo_comida: 'almuerzo/cena',
    categoria: 'alta_proteina',
    calorias: 600,
    proteinas: 45,
    carbohidratos: 5,
    grasas: 42,
    fibra: 1,
    tiempo_preparacion: 15,
    tiempo_coccion: 90,
    tiempo_total: 105,
    ingredientes: [
      '1kg costillar de cerdo',
      '3 dientes de ajo',
      '1 cdita de pimentón',
      'romero y tomillo',
      'aceite de oliva',
      'sal y pimienta a gusto',
    ],
  },
  'Paella de mariscos': {
    nombre: 'Arroz con pollo y vegetales',
    nombre_original: 'Arroz con pollo y vegetales',
    tipo_comida: 'almuerzo/cena',
    categoria: 'alta_proteina',
    calorias: 520,
    proteinas: 35,
    carbohidratos: 60,
    grasas: 14,
    fibra: 5,
    tiempo_preparacion: 15,
    tiempo_coccion: 35,
    tiempo_total: 50,
    ingredientes: [
      '300g arroz',
      '2 pechugas de pollo',
      '1 morrón rojo',
      '1 cebolla',
      '100g arvejas',
      '1 zanahoria',
      'caldo de verduras',
      'sal y pimienta a gusto',
    ],
  },
  'Caldo de pollo con jengibre': {
    nombre: 'Sopa de pollo con fideos',
    nombre_original: 'Sopa de pollo con fideos',
    tipo_comida: 'almuerzo/cena',
    categoria: 'alta_proteina',
    calorias: 300,
    proteinas: 25,
    carbohidratos: 30,
    grasas: 8,
    fibra: 3,
    tiempo_preparacion: 10,
    tiempo_coccion: 30,
    tiempo_total: 40,
    ingredientes: [
      '2 pechugas de pollo',
      '100g fideos finos',
      '1 zanahoria',
      '1 rama de apio',
      '1 cebolla',
      'caldo de pollo',
      'sal a gusto',
    ],
  },
  'Muslos de pavo al horno': {
    nombre: 'Muslos de pollo al horno con papas',
    nombre_original: 'Muslos de pollo al horno con papas',
    tipo_comida: 'almuerzo/cena',
    categoria: 'alta_proteina',
    calorias: 550,
    proteinas: 38,
    carbohidratos: 40,
    grasas: 25,
    fibra: 4,
    tiempo_preparacion: 15,
    tiempo_coccion: 50,
    tiempo_total: 65,
    ingredientes: [
      '4 muslos de pollo',
      '4 papas medianas',
      '2 dientes de ajo',
      'romero',
      'aceite de oliva',
      'sal y pimienta a gusto',
    ],
  },
};

/**
 * Reemplaza en la DB las recetas con ingredientes difíciles de conseguir.
 * Busca por nombre exacto y actualiza la fila completa (mantiene el id).
 * Devuelve la lista de nombres efectivamente reemplazados.
 */
export function aplicarReemplazos(db: Database.Database): string[] {
  const update = db.prepare(`
    UPDATE recetas SET
      nombre = ?, nombre_original = ?, origen = 'argentina', tipo_comida = ?, categoria = ?,
      calorias = ?, proteinas = ?, carbohidratos = ?, grasas = ?, fibra = ?,
      tiempo_preparacion = ?, tiempo_coccion = ?, tiempo_total = ?,
      ingredientes = ?, url_original = ''
    WHERE nombre = ?
  `);

  const reemplazados: string[] = [];
  const tx = db.transaction(() => {
    for (const [original, r] of Object.entries(REEMPLAZOS)) {
      const info = update.run(
        r.nombre, r.nombre_original, r.tipo_comida, r.categoria,
        r.calorias, r.proteinas, r.carbohidratos, r.grasas, r.fibra,
        r.tiempo_preparacion, r.tiempo_coccion, r.tiempo_total,
        JSON.stringify(r.ingredientes),
        original
      );
      if (info.changes > 0) reemplazados.push(`${original} → ${r.nombre}`);
    }
  });
  tx();
  return reemplazados;
}
