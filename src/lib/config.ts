import { readFileSync } from 'fs';
import { join } from 'path';

function loadEnvLocal(): Record<string, string> {
  try {
    const content = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

const env = loadEnvLocal();

export const config = {
  anthropicKey: env.APP_ANTHROPIC_KEY ?? '',
  geoapifyKey: env.GEOAPIFY_API_KEY ?? '',
  nasaFirmsKey: env.NASA_FIRMS_MAP_KEY ?? '',
  recreationGovKey: env.RECREATION_GOV_API_KEY ?? '',
};
