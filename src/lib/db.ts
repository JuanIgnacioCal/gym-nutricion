import Database from 'better-sqlite3';
import path from 'path';
import { seedRecetas } from './seed';

const DB_PATH = path.join(process.cwd(), 'gym-nutrition.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
    seedRecetas(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recetas (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      nombre_original TEXT,
      origen TEXT DEFAULT 'dataset',
      tipo_comida TEXT,
      categoria TEXT,
      calorias INTEGER NOT NULL,
      proteinas REAL NOT NULL,
      carbohidratos REAL NOT NULL,
      grasas REAL NOT NULL,
      fibra REAL DEFAULT 0,
      porciones INTEGER DEFAULT 1,
      tiempo_preparacion INTEGER DEFAULT 0,
      tiempo_coccion INTEGER DEFAULT 0,
      tiempo_total INTEGER DEFAULT 0,
      ingredientes TEXT,
      url_original TEXT,
      calificacion REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favoritos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT NOT NULL,
      receta_id INTEGER,
      comida_personalizada TEXT,
      tipo TEXT DEFAULT 'receta',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (receta_id) REFERENCES recetas(id)
    );

    CREATE TABLE IF NOT EXISTS registro_diario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT NOT NULL,
      fecha TEXT NOT NULL,
      tipo_comida TEXT NOT NULL,
      receta_id INTEGER,
      nombre_comida TEXT NOT NULL,
      calorias INTEGER NOT NULL,
      proteinas REAL NOT NULL,
      carbohidratos REAL NOT NULL,
      grasas REAL NOT NULL,
      fibra REAL DEFAULT 0,
      gramos REAL DEFAULT 100,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (receta_id) REFERENCES recetas(id)
    );


    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      objetivo_calorias INTEGER DEFAULT 2000,
      objetivo_proteinas REAL DEFAULT 150,
      objetivo_carbohidratos REAL DEFAULT 200,
      objetivo_grasas REAL DEFAULT 65,
      objetivo_comidas INTEGER DEFAULT 3,
      tema TEXT DEFAULT 'oscuro',
      datos_fisicos TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plan_diario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id TEXT NOT NULL,
      fecha TEXT NOT NULL,
      desayuno_id INTEGER,
      almuerzo_id INTEGER,
      merienda_id INTEGER,
      cena_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (desayuno_id) REFERENCES recetas(id),
      FOREIGN KEY (almuerzo_id) REFERENCES recetas(id),
      FOREIGN KEY (merienda_id) REFERENCES recetas(id),
      FOREIGN KEY (cena_id) REFERENCES recetas(id)
    );
  `);
}

export default getDb;
