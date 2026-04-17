/**
 * Runtime config + localStorage helpers.
 */

import type { ProviderChoice } from './types';

export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

if (!API_BASE) {
  console.warn(
    '[hearthstone] VITE_API_BASE is not set. Create .env from .env.example.'
  );
}

const KEY_STORAGE = 'hearthstone:api_key';
const PROVIDER_STORAGE = 'hearthstone:provider';
const MODEL_STORAGE = 'hearthstone:model';

// ─── API key ─────────────────────────────────────────────────────────────────────
export function getApiKey(): string | null {
  return localStorage.getItem(KEY_STORAGE);
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEY_STORAGE, key.trim());
}

export function clearApiKey(): void {
  localStorage.removeItem(KEY_STORAGE);
}

// ─── Provider preference ────────────────────────────────────────────────────────────
export function getProviderChoice(): ProviderChoice {
  const v = localStorage.getItem(PROVIDER_STORAGE);
  if (v === 'openrouter' || v === 'anthropic' || v === 'local' || v === 'auto') {
    return v;
  }
  return 'auto';
}

export function setProviderChoice(choice: ProviderChoice): void {
  localStorage.setItem(PROVIDER_STORAGE, choice);
}

// ─── Model preference ────────────────────────────────────────────────────────────────
export function getModelAlias(): string {
  return localStorage.getItem(MODEL_STORAGE) ?? 'sonnet';
}

export function setModelAlias(alias: string): void {
  localStorage.setItem(MODEL_STORAGE, alias);
}
