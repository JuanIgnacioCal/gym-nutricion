import { NextResponse } from 'next/server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import getDb from '@/lib/db';
import { getSesion } from '@/lib/auth';
import { esEmailDueno } from '@/lib/gymConfig';

export const dynamic = 'force-dynamic';

/**
 * GET /api/panel/backup — descarga una copia consistente de la base de datos.
 *
 * Solo el dueño del gym (getSesion() verifica la firma del JWT + esEmailDueno).
 * Sirve como respaldo MANUAL: toda la data vive en un único archivo SQLite, así que
 * conviene bajar una copia seguido y guardarla afuera (Drive, mail, etc.). El backup
 * automático a un destino externo queda para más adelante.
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
  const tmpPath = path.join(os.tmpdir(), `gymnutri-backup-${Date.now()}.db`);

  try {
    // db.backup() copia de forma consistente aunque la DB esté en modo WAL y en uso.
    await db.backup(tmpPath);
    const buffer = fs.readFileSync(tmpPath);
    const fecha = new Date().toISOString().slice(0, 10);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="backup-${fecha}.db"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo generar el backup' }, { status: 500 });
  } finally {
    fs.rmSync(tmpPath, { force: true });
  }
}
