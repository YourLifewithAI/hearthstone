/**
 * Provider management routes.
 *
 * GET /providers              — list all providers with configured/healthy status
 * GET /providers/status       — same as above (alias)
 * POST /providers/refresh     — force re-check health for all providers
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { PROVIDERS, getHealth, MODELS } from '../lib/providers';

export const providerRoutes = new Hono<{ Bindings: Env }>();

async function buildStatus(env: Env, force = false) {
  const entries = await Promise.all(
    Object.entries(PROVIDERS).map(async ([id, provider]) => {
      const configured = provider.isConfigured(env);
      let health: { healthy: boolean; detail?: string; checked_at: number } | null = null;
      if (configured) {
        health = await getHealth(id, env, { force });
      }
      return {
        id,
        label: provider.label,
        configured,
        healthy: health?.healthy ?? false,
        detail: health?.detail,
        checked_at: health?.checked_at,
      };
    })
  );

  return {
    providers: entries,
    models: Object.entries(MODELS).map(([alias, entry]) => ({
      alias,
      label: entry.label,
      note: entry.note,
      available_on: Object.entries(entry.providers)
        .filter(([, id]) => id !== null)
        .map(([p]) => p),
    })),
  };
}

providerRoutes.get('/', async (c) => c.json(await buildStatus(c.env)));
providerRoutes.get('/status', async (c) => c.json(await buildStatus(c.env)));
providerRoutes.post('/refresh', async (c) => c.json(await buildStatus(c.env, true)));
