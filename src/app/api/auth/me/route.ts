import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getSesion, getTokenFromCookies, verificarToken } from '@/lib/auth';
import { esEmailDueno } from '@/lib/gymConfig';
import type { UserProfile } from '@/types';

export const dynamic = 'force-dynamic';

interface UsuarioRow {
  id: string;
  nombre: string;
  email: string;
  objetivo_calorias: number;
  objetivo_proteinas: number;
  objetivo_carbohidratos: number;
  objetivo_grasas: number;
  objetivo_comidas: number;
  tema: string;
  datos_fisicos: string | null;
}

export async function GET() {
  const token = getTokenFromCookies();
  if (!token) return NextResponse.json(null, { status: 401 });

  const payload = verificarToken(token);
  if (!payload) return NextResponse.json(null, { status: 401 });

  const db = getDb();
  const row = db.prepare(
    'SELECT id, nombre, email, objetivo_calorias, objetivo_proteinas, objetivo_carbohidratos, objetivo_grasas, objetivo_comidas, tema, datos_fisicos FROM usuarios WHERE id = ?'
  ).get(payload.sub) as UsuarioRow | undefined;

  if (!row) return NextResponse.json(null, { status: 401 });

  const perfil: UserProfile = {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    objetivo: {
      calorias: row.objetivo_calorias,
      proteinas: row.objetivo_proteinas,
      carbohidratos: row.objetivo_carbohidratos,
      grasas: row.objetivo_grasas,
      comidas: (row.objetivo_comidas === 4 ? 4 : 3) as 3 | 4,
    },
    datos_fisicos: row.datos_fisicos ? JSON.parse(row.datos_fisicos) : undefined,
    tema: (row.tema ?? 'oscuro') as 'oscuro' | 'claro',
    onboardingCompleto: true,
    esDueno: esEmailDueno(row.email),
  };

  return NextResponse.json(perfil);
}

/**
 * Actualiza el perfil del usuario logueado (objetivo, datos físicos, nombre, tema).
 * El usuario se deriva SIEMPRE de la sesión (cookie), nunca de un parámetro del cliente.
 * Solo se actualizan los campos presentes en el body; el email NO se cambia acá
 * (es el identificador de login). Devuelve el perfil actualizado.
 */
export async function PUT(req: NextRequest) {
  const sesion = getSesion();
  if (!sesion) return NextResponse.json(null, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const db = getDb();
  const row = db.prepare(
    'SELECT id, nombre, email, objetivo_calorias, objetivo_proteinas, objetivo_carbohidratos, objetivo_grasas, objetivo_comidas, tema, datos_fisicos FROM usuarios WHERE id = ?'
  ).get(sesion.sub) as UsuarioRow | undefined;
  if (!row) return NextResponse.json(null, { status: 401 });

  const clamp = (v: unknown, def: number, min: number, max: number): number => {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.min(max, Math.max(min, Math.round(n)));
  };

  const nombre =
    typeof body.nombre === 'string' && body.nombre.trim() ? body.nombre.trim() : row.nombre;
  const tema = body.tema === 'claro' || body.tema === 'oscuro' ? body.tema : row.tema;

  const o = body.objetivo;
  const objetivo_calorias = o ? clamp(o.calorias, row.objetivo_calorias, 1000, 6000) : row.objetivo_calorias;
  const objetivo_proteinas = o ? clamp(o.proteinas, row.objetivo_proteinas, 20, 400) : row.objetivo_proteinas;
  const objetivo_carbohidratos = o ? clamp(o.carbohidratos, row.objetivo_carbohidratos, 20, 700) : row.objetivo_carbohidratos;
  const objetivo_grasas = o ? clamp(o.grasas, row.objetivo_grasas, 10, 300) : row.objetivo_grasas;
  const objetivo_comidas = o ? (Number(o.comidas) === 4 ? 4 : 3) : row.objetivo_comidas;

  let datos_fisicos = row.datos_fisicos;
  const d = body.datos_fisicos;
  if (d && typeof d === 'object') {
    const actividades = ['sedentario', 'moderado', 'activo', 'muy_activo'];
    const objetivos = ['bajar', 'mantener', 'subir'];
    datos_fisicos = JSON.stringify({
      peso: clamp(d.peso, 0, 0, 400),
      altura: clamp(d.altura, 0, 0, 260),
      edad: clamp(d.edad, 0, 0, 120),
      sexo: d.sexo === 'femenino' ? 'femenino' : 'masculino',
      nivel_actividad: actividades.includes(d.nivel_actividad) ? d.nivel_actividad : 'moderado',
      objetivo_tipo: objetivos.includes(d.objetivo_tipo) ? d.objetivo_tipo : 'mantener',
    });
  }

  db.prepare(
    'UPDATE usuarios SET nombre = ?, tema = ?, objetivo_calorias = ?, objetivo_proteinas = ?, objetivo_carbohidratos = ?, objetivo_grasas = ?, objetivo_comidas = ?, datos_fisicos = ? WHERE id = ?'
  ).run(
    nombre, tema, objetivo_calorias, objetivo_proteinas, objetivo_carbohidratos,
    objetivo_grasas, objetivo_comidas, datos_fisicos, sesion.sub,
  );

  const perfil: UserProfile = {
    id: row.id,
    nombre,
    email: row.email,
    objetivo: {
      calorias: objetivo_calorias,
      proteinas: objetivo_proteinas,
      carbohidratos: objetivo_carbohidratos,
      grasas: objetivo_grasas,
      comidas: (objetivo_comidas === 4 ? 4 : 3) as 3 | 4,
    },
    datos_fisicos: datos_fisicos ? JSON.parse(datos_fisicos) : undefined,
    tema: tema as 'oscuro' | 'claro',
    onboardingCompleto: true,
    esDueno: esEmailDueno(row.email),
  };
  return NextResponse.json(perfil);
}
