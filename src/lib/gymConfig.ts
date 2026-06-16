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
