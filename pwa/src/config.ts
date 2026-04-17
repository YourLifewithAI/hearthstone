/**
 * Runtime config. Build-time env var from .env (see .env.example).
 *
 * API key is stored in localStorage after first setup — not baked into the
 * bundle. On first run, the user pastes it in (see pages/Setup.tsx).
 */

export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

if (!API_BASE) {
  console.warn(
    '[hearthstone] VITE_API_BASE is not set. Create .env from .env.example.'
  );
}

const KEY_STORAGE = 'hearthstone:api_key';

export function getApiKey(): string | null {
  return localStorage.getItem(KEY_STORAGE);
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEY_STORAGE, key.trim());
}

export function clearApiKey(): void {
  localStorage.removeItem(KEY_STORAGE);
}
