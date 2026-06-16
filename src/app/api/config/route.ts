import { NextResponse } from 'next/server';
import { getGymConfig } from '@/lib/gymConfig';

export const dynamic = 'force-static';

/** Expone la info pública del gym (nombre, tagline, logo) al cliente. */
export async function GET() {
  const { gym } = getGymConfig();
  return NextResponse.json({
    nombre: gym.nombre,
    tagline: gym.tagline,
    logo: gym.logo,
  });
}
