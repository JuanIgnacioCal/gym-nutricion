import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSesion } from '@/lib/auth';
import { esEmailDueno } from '@/lib/gymConfig';
import type { ObjetivoTipo, PanelData, PanelSerie, PanelSocio } from '@/types';

export const dynamic = 'force-dynamic';

// --- Helpers de fecha (server, runtime Node). Trabajamos con strings 'YYYY-MM-DD'
//     para comparar directo contra las columnas `fecha` (que ya están en ese formato). ---
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDias(base: Date, n: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function etiqueta(fechaIso: string): string {
  // 'YYYY-MM-DD' -> 'DD/MM'
  return fechaIso.slice(8, 10) + '/' + fechaIso.slice(5, 7);
}

interface SocioRow {
  id: string;
  nombre: string;
  email: string;
  objetivo_calorias: number;
  objetivo_comidas: number;
  datos_fisicos: string | null;
  created_at: string;
  ult_actividad: string | null;
}

/**
 * GET /api/panel — métricas agregadas del gym para el dueño.
 *
 * Seguridad: la identidad sale SIEMPRE de la cookie de sesión (getSesion()).
 * Solo el dueño (email === gym.config.json → ownerEmail) puede leer esto; cualquier
 * otro usuario logueado recibe 403. Nunca se confía en parámetros del cliente.
 *
 * "Socio activo" = tiene una fila en plan_diario (generó plan) o en registro_diario
 * (registró comida) con `fecha` dentro de la ventana indicada.
 */
export async function GET() {
  const sesion = getSesion();
  if (!sesion) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  if (!esEmailDueno(sesion.email)) {
    return NextResponse.json({ error: 'Acceso solo para el dueño del gym' }, { status: 403 });
  }

  const db = getDb();

  const hoy = new Date();
  const hoyStr = ymd(hoy);
  const corte7 = ymd(addDias(hoy, -6)); // incluye hoy => ventana de 7 días
  const corte30 = ymd(addDias(hoy, -29)); // ventana de 30 días
  const inicioSerie = ymd(addDias(hoy, -55)); // 56 días => alcanza para 8 semanas
  const mesActual = hoyStr.slice(0, 7); // 'YYYY-MM'

  // ---------- KPIs ----------
  const total = (db.prepare('SELECT COUNT(*) AS n FROM usuarios').get() as { n: number }).n;

  const sqlActivos =
    'SELECT COUNT(*) AS n FROM (' +
    'SELECT usuario_id FROM plan_diario WHERE fecha >= ? ' +
    'UNION SELECT usuario_id FROM registro_diario WHERE fecha >= ?)';
  const activos7 = (db.prepare(sqlActivos).get(corte7, corte7) as { n: number }).n;
  const activos30 = (db.prepare(sqlActivos).get(corte30, corte30) as { n: number }).n;

  const altasMes = (
    db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE substr(created_at, 1, 7) = ?").get(mesActual) as {
      n: number;
    }
  ).n;

  // ---------- Serie temporal (conteos por fecha) ----------
  const planesPorFecha = db
    .prepare('SELECT fecha, COUNT(*) AS c FROM plan_diario WHERE fecha >= ? GROUP BY fecha')
    .all(inicioSerie) as { fecha: string; c: number }[];
  const comidasPorFecha = db
    .prepare('SELECT fecha, COUNT(*) AS c FROM registro_diario WHERE fecha >= ? GROUP BY fecha')
    .all(inicioSerie) as { fecha: string; c: number }[];

  const mapPlanes = new Map(planesPorFecha.map((r) => [r.fecha, r.c]));
  const mapComidas = new Map(comidasPorFecha.map((r) => [r.fecha, r.c]));

  // Diaria: últimos 14 días.
  const dia: PanelSerie = { labels: [], planes: [], comidas: [] };
  for (let i = 13; i >= 0; i--) {
    const f = ymd(addDias(hoy, -i));
    dia.labels.push(etiqueta(f));
    dia.planes.push(mapPlanes.get(f) ?? 0);
    dia.comidas.push(mapComidas.get(f) ?? 0);
  }

  // Semanal: 8 bloques de 7 días terminando hoy.
  const semana: PanelSerie = { labels: [], planes: [], comidas: [] };
  for (let b = 7; b >= 0; b--) {
    const fin = addDias(hoy, -7 * b);
    const ini = addDias(fin, -6);
    let p = 0;
    let c = 0;
    for (let k = 0; k < 7; k++) {
      const f = ymd(addDias(ini, k));
      p += mapPlanes.get(f) ?? 0;
      c += mapComidas.get(f) ?? 0;
    }
    semana.labels.push(etiqueta(ymd(ini)));
    semana.planes.push(p);
    semana.comidas.push(c);
  }

  // ---------- Tabla de socios + última actividad ----------
  const socios = db
    .prepare(
      `SELECT u.id, u.nombre, u.email, u.objetivo_calorias, u.objetivo_comidas,
              u.datos_fisicos, u.created_at,
              (SELECT MAX(f) FROM (
                 SELECT MAX(fecha) AS f FROM plan_diario WHERE usuario_id = u.id
                 UNION ALL
                 SELECT MAX(fecha) AS f FROM registro_diario WHERE usuario_id = u.id
               )) AS ult_actividad
       FROM usuarios u`,
    )
    .all() as SocioRow[];

  const sociosOut: PanelSocio[] = socios.map((s) => {
    let objetivo_tipo: ObjetivoTipo | null = null;
    if (s.datos_fisicos) {
      try {
        const df = JSON.parse(s.datos_fisicos) as { objetivo_tipo?: string };
        if (df.objetivo_tipo === 'bajar' || df.objetivo_tipo === 'mantener' || df.objetivo_tipo === 'subir') {
          objetivo_tipo = df.objetivo_tipo;
        }
      } catch {
        // datos_fisicos corrupto: lo dejamos como null (sin objetivo definido)
      }
    }
    return {
      id: s.id,
      nombre: s.nombre,
      email: s.email,
      alta: (s.created_at ?? '').slice(0, 10),
      ultimo: s.ult_actividad ?? null,
      kcal: s.objetivo_calorias,
      comidas: s.objetivo_comidas === 4 ? 4 : 3,
      objetivo_tipo,
      esDueno: esEmailDueno(s.email),
    };
  });

  // ---------- Distribución de objetivos + promedios ----------
  const objetivos = { bajar: 0, mantener: 0, subir: 0, sin_definir: 0 };
  const comidasSplit = { tres: 0, cuatro: 0 };
  let sumaKcal = 0;
  for (const s of sociosOut) {
    if (s.objetivo_tipo) objetivos[s.objetivo_tipo]++;
    else objetivos.sin_definir++;
    if (s.comidas === 4) comidasSplit.cuatro++;
    else comidasSplit.tres++;
    sumaKcal += s.kcal;
  }
  const kcalPromedio = total > 0 ? Math.round(sumaKcal / total) : 0;

  const data: PanelData = {
    generadoEl: hoyStr,
    kpis: { total, activos7, activos30, altasMes },
    serie: { dia, semana },
    socios: sociosOut,
    objetivos,
    kcalPromedio,
    comidasSplit,
  };

  return NextResponse.json(data);
}
