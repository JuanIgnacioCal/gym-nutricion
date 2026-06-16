import type Database from 'better-sqlite3';

/**
 * Glosario inglés → español argentino para ingredientes.
 * Ordenado de frases largas a palabras cortas (las primeras se aplican antes).
 * Terminología local: morrón, zapallito, arvejas, choclo, carne picada, etc.
 */
const GLOSARIO: [RegExp, string][] = [
  // Frases / términos compuestos
  [/\bground beef\b/gi, 'carne picada'],
  [/\bground chicken\b/gi, 'pollo picado'],
  [/\bground turkey\b/gi, 'pavo picado'],
  [/\bground pork\b/gi, 'cerdo picado'],
  [/\bground black pepper\b/gi, 'pimienta negra molida'],
  [/\bblack pepper\b/gi, 'pimienta negra'],
  [/\bbell pepper(s)?\b/gi, 'morrón'],
  [/\bred pepper(s)?\b/gi, 'morrón rojo'],
  [/\bgreen pepper(s)?\b/gi, 'morrón verde'],
  [/\bsweet corn\b/gi, 'choclo'],
  [/\bcorn\b/gi, 'choclo'],
  [/\bgreen peas\b/gi, 'arvejas'],
  [/\bpeas\b/gi, 'arvejas'],
  [/\bzucchini\b/gi, 'zapallito'],
  [/\bsquash\b/gi, 'zapallo'],
  [/\bpumpkin\b/gi, 'zapallo'],
  [/\bchicken breast(s)?\b/gi, 'pechuga de pollo'],
  [/\bskinless\b/gi, 'sin piel'],
  [/\bboneless\b/gi, 'sin hueso'],
  [/\bolive oil\b/gi, 'aceite de oliva'],
  [/\bvegetable oil\b/gi, 'aceite'],
  [/\bbread crumbs\b/gi, 'pan rallado'],
  [/\bheavy cream\b/gi, 'crema de leche'],
  [/\bsour cream\b/gi, 'crema agria'],
  [/\bcream cheese\b/gi, 'queso crema'],
  [/\bbrown sugar\b/gi, 'azúcar negra'],
  [/\bbaking soda\b/gi, 'bicarbonato'],
  [/\bbaking powder\b/gi, 'polvo de hornear'],
  [/\ball-purpose flour\b/gi, 'harina común'],
  [/\bgreen onion(s)?\b/gi, 'cebolla de verdeo'],
  [/\bgarlic powder\b/gi, 'ajo en polvo'],
  [/\bonion powder\b/gi, 'cebolla en polvo'],
  // Palabras simples
  [/\bchicken\b/gi, 'pollo'],
  [/\bbeef\b/gi, 'carne de vaca'],
  [/\bpork\b/gi, 'cerdo'],
  [/\bturkey\b/gi, 'pavo'],
  [/\begg(s)?\b/gi, 'huevo'],
  [/\bflour\b/gi, 'harina'],
  [/\bsugar\b/gi, 'azúcar'],
  [/\bsalt\b/gi, 'sal'],
  [/\bpepper\b/gi, 'pimienta'],
  [/\bbutter\b/gi, 'manteca'],
  [/\bcheese\b/gi, 'queso'],
  [/\bmilk\b/gi, 'leche'],
  [/\bwater\b/gi, 'agua'],
  [/\bonion(s)?\b/gi, 'cebolla'],
  [/\bgarlic\b/gi, 'ajo'],
  [/\btomato(es)?\b/gi, 'tomate'],
  [/\bpotato(es)?\b/gi, 'papa'],
  [/\bcarrot(s)?\b/gi, 'zanahoria'],
  [/\bmushroom(s)?\b/gi, 'champiñón'],
  [/\brice\b/gi, 'arroz'],
  [/\bbacon\b/gi, 'panceta'],
  [/\bshredded\b/gi, 'rallado'],
  [/\bchopped\b/gi, 'picado'],
  [/\bsliced\b/gi, 'en rodajas'],
  [/\bminced\b/gi, 'picado fino'],
  [/\bdiced\b/gi, 'en cubos'],
  [/\bfresh\b/gi, 'fresco'],
  [/\bto taste\b/gi, 'a gusto'],
  [/\bcup(s)?\b/gi, 'taza'],
  [/\btablespoon(s)?\b/gi, 'cucharada'],
  [/\bteaspoon(s)?\b/gi, 'cucharadita'],
  [/\bpound(s)?\b/gi, 'libra'],
  [/\bounce(s)?\b/gi, 'onza'],
];

/** Traduce un ingrediente individual aplicando el glosario. */
export function traducirIngrediente(texto: string): string {
  return GLOSARIO.reduce((acc, [re, es]) => acc.replace(re, es), texto);
}

/** Traduce un array de ingredientes. */
export function traducirIngredientes(arr: string[]): string[] {
  return arr.map(traducirIngrediente);
}

/**
 * Traduce al español argentino los ingredientes de las recetas con
 * origen 'allrecipes_dataset' y actualiza la DB.
 * Devuelve cuántas recetas se tradujeron.
 */
export function traducirIngredientesDataset(db: Database.Database): number {
  const filas = db
    .prepare(`SELECT id, ingredientes FROM recetas WHERE origen = 'allrecipes_dataset'`)
    .all() as { id: number; ingredientes: string | null }[];

  const update = db.prepare('UPDATE recetas SET ingredientes = ? WHERE id = ?');
  const tx = db.transaction((items: typeof filas) => {
    let n = 0;
    for (const f of items) {
      if (!f.ingredientes) continue;
      try {
        const arr = JSON.parse(f.ingredientes);
        if (!Array.isArray(arr)) continue;
        update.run(JSON.stringify(traducirIngredientes(arr)), f.id);
        n++;
      } catch {
        /* ignorar filas con ingredientes inválidos */
      }
    }
    return n;
  });

  return tx(filas);
}
