import fs from 'fs';
import path from 'path';
import { GymConfig } from '@/types';

let config: GymConfig | null = null;

export function getGymConfig(): GymConfig {
  if (!config) {
    const configPath = path.join(process.cwd(), 'gym.config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  return config!;
}

/**
 * True si el email es el del dueño del gym (gym.config.json → ownerEmail).
 * Comparación case-insensitive. Si no hay ownerEmail configurado, nadie es dueño.
 * Es la fuente de verdad del acceso al panel: usar SIEMPRE en el server,
 * nunca confiar en un flag mandado por el cliente.
 */
export function esEmailDueno(email: string | null | undefined): boolean {
  if (!email) return false;
  const owner = getGymConfig().ownerEmail;
  if (!owner) return false;
  return owner.toLowerCase().trim() === email.toLowerCase().trim();
}
