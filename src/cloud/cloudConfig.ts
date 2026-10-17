// Phase 9.9: which Supabase project the cloud saves talk to. Read from the build (VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY) or, for a self-hosted project, from the Options window. The anon key is meant to be public:
// what protects a profile's rows is the row-level-security policy in supabase/migrations plus the profile's sync key.

export interface CloudConfig { url: string; anonKey: string }

const CONFIG_KEY = 'ron-cloud-config-v1';

/** https, or plain http only for a local development server. Returns the URL without a trailing slash, or null. */
export function cleanProjectUrl(raw: string): string | null {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  return (url.origin + url.pathname).replace(/\/+$/, '');
}

export function validateConfig(config: Partial<CloudConfig> | null | undefined): CloudConfig | null {
  if (!config || typeof config.url !== 'string' || typeof config.anonKey !== 'string') return null;
  const url = cleanProjectUrl(config.url), anonKey = config.anonKey.trim();
  if (!url || anonKey.length < 20 || anonKey.length > 4096 || /\s/.test(anonKey)) return null;
  return { url, anonKey };
}

export function readCloudConfig(): CloudConfig | null {
  try {
    const stored = validateConfig(JSON.parse(localStorage.getItem(CONFIG_KEY) ?? 'null'));
    if (stored) return stored;
  } catch { /* fall through to the build's configuration */ }
  const env = import.meta.env as Record<string, string | undefined> | undefined;
  return validateConfig({ url: env?.VITE_SUPABASE_URL, anonKey: env?.VITE_SUPABASE_ANON_KEY });
}

export function saveCloudConfig(config: Partial<CloudConfig>): CloudConfig | null {
  const valid = validateConfig(config);
  if (!valid) return null;
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(valid)); } catch { /* blocked: the setting lasts until reload */ }
  return valid;
}

export function clearCloudConfig() { try { localStorage.removeItem(CONFIG_KEY); } catch { /* nothing stored */ } }

const AUTO_KEY = 'ron-cloud-auto-v1';
/** Automatic upload after each local autosave. Off until the player turns it on. */
export function readAutoSync(): boolean { try { return localStorage.getItem(AUTO_KEY) === '1'; } catch { return false; } }
export function writeAutoSync(on: boolean) { try { localStorage.setItem(AUTO_KEY, on ? '1' : '0'); } catch { /* blocked: lasts until reload */ } }
