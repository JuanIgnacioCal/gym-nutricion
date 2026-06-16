import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getTokenFromCookies, verificarToken } from '@/lib/auth';
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
  };

  return NextResponse.json(perfil);
}
