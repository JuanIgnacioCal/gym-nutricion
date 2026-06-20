import type Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { traducirIngredientesDataset } from './traducir';
import { aplicarReemplazos } from './reemplazos';

export function seedRecetas(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) as count FROM recetas').get() as { count: number };
  // Seed idempotente: NO cortamos si ya hay datos. Insertamos con INSERT OR IGNORE
  // para sumar recetas nuevas del JSON (ids que aún no están) sin tocar las existentes.
  // Esto permite que recetas agregadas a data/recetas.json aparezcan en el próximo deploy,
  // aunque la DB ya esté poblada (ej. el Volume persistente de Railway).
  const fresco = count.count === 0;

  const recetasPath = path.join(process.cwd(), 'data', 'recetas.json');
  const recetas = JSON.parse(fs.readFileSync(recetasPath, 'utf-8'));

  const insert = db.prepare(`
    INSERT OR IGNORE INTO recetas (
      id, nombre, nombre_original, origen, tipo_comida, categoria,
      calorias, proteinas, carbohidratos, grasas, fibra, porciones,
      tiempo_preparacion, tiempo_coccion, tiempo_total,
      ingredientes, url_original, calificacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: any[]) => {
    for (const r of items) {
      insert.run(
        r.id, r.nombre, r.nombre_original ?? '', r.origen ?? 'dataset',
        r.tipo_comida ?? '', r.categoria ?? '',
        r.calorias, r.proteinas, r.carbohidratos, r.grasas,
        r.fibra ?? 0, r.porciones ?? 1,
        r.tiempo_preparacion ?? 0, r.tiempo_coccion ?? 0, r.tiempo_total ?? 0,
        JSON.stringify(r.ingredientes ?? []),
        r.url_original ?? '', r.calificacion ?? 0
      );
    }
  });

  insertMany(recetas);
  const total = (db.prepare('SELECT COUNT(*) as count FROM recetas').get() as { count: number }).count;
  console.log(`✅ ${total} recetas en SQLite (de ${recetas.length} entradas del JSON)`);

  // Post-procesamiento SOLO en seed fresco. No debe re-aplicarse sobre una DB ya poblada;
  // además las recetas nuevas (origen 'local') ya vienen en español, no necesitan traducción.
  if (fresco) {
    // PROBLEMA 3 — traducir ingredientes de recetas en inglés (allrecipes_dataset)
    const traducidas = traducirIngredientesDataset(db);
    console.log(`🌐 Ingredientes traducidos en ${traducidas} recetas (allrecipes_dataset)`);

    // PROBLEMA 7 — reemplazar recetas con ingredientes difíciles de conseguir
    const reemplazadas = aplicarReemplazos(db);
    console.log(`🔁 Recetas reemplazadas: ${reemplazadas.length ? reemplazadas.join(', ') : 'ninguna'}`);
  }
}
