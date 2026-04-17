/**
 * Provider registry + resolution helpers.
 */

import type { Env } from '../../types';
import type { Provider } from './types';
import { anthropicProvider } from './anthropic';
import { openrouterProvider } from './openrouter';
import { localProvider } from './local';

export const PROVIDERS: Record<string, Provider> = {
  openrouter: openrouterProvider,
  anthropic: anthropicProvider,
  local: localProvider,
};

export type ProviderId = keyof typeof PROVIDERS | 'auto';

export function getProvider(id: string): Provider | null {
  return PROVIDERS[id] ?? null;
}

export function listProviders(): Provider[] {
  return Object.values(PROVIDERS);
}

// In-memory health cache. Workers isolate persistence is short but sufficient
// to avoid per-request pings during active usage.
interface HealthCacheEntry {
  healthy: boolean;
  detail?: string;
  checked_at: number;
}
const healthCache: Record<string, HealthCacheEntry> = {};
const HEALTH_TTL_MS = 30_000;

export async function getHealth(
  providerId: string,
  env: Env,
  { force = false }: { force?: boolean } = {}
): Promise<HealthCacheEntry> {
  const cached = healthCache[providerId];
  if (!force && cached && Date.now() - cached.checked_at < HEALTH_TTL_MS) {
    return cached;
  }
  const provider = getProvider(providerId);
  if (!provider) {
    const fresh: HealthCacheEntry = {
      healthy: false,
      detail: 'unknown provider',
      checked_at: Date.now(),
    };
    healthCache[providerId] = fresh;
    return fresh;
  }
  const result = await provider.healthCheck(env);
  const entry: HealthCacheEntry = {
    healthy: result.healthy,
    detail: result.detail,
    checked_at: Date.now(),
  };
  healthCache[providerId] = entry;
  return entry;
}

/**
 * Auto-resolve: prefer local (if healthy), else openrouter (if configured),
 * else anthropic. Returns null if nothing is available.
 */
export async function resolveAuto(env: Env): Promise<Provider | null> {
  // Try local first — it's the user's own endpoint, probably preferred when up
  if (localProvider.isConfigured(env)) {
    const health = await getHealth('local', env);
    if (health.healthy) return localProvider;
  }
  if (openrouterProvider.isConfigured(env)) {
    return openrouterProvider;
  }
  if (anthropicProvider.isConfigured(env)) {
    return anthropicProvider;
  }
  return null;
}

export { MODELS, resolveModelId } from './types';
