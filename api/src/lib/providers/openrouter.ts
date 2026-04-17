/**
 * OpenRouter provider — OpenAI-compatible gateway to 300+ models.
 *
 * Uses OPENROUTER_API_KEY secret. SSE format is OpenAI chat completions.
 *
 * Recommend BYOK: users add their own Anthropic/OpenAI/etc. keys in the
 * OpenRouter dashboard (https://openrouter.ai/settings/integrations) and
 * requests route through their own keys with zero OpenRouter markup.
 */

import type { Provider, ProviderChatRequest, HealthResult } from './types';
import type { Env } from '../../types';

export const openrouterProvider: Provider = {
  id: 'openrouter',
  label: 'OpenRouter',

  isConfigured(env: Env): boolean {
    return !!env.OPENROUTER_API_KEY;
  },

  async healthCheck(env: Env): Promise<HealthResult> {
    if (!env.OPENROUTER_API_KEY) {
      return { healthy: false, detail: 'OPENROUTER_API_KEY not set' };
    }
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
      });
      return res.ok
        ? { healthy: true }
        : { healthy: false, detail: `HTTP ${res.status}` };
    } catch (err) {
      return { healthy: false, detail: (err as Error).message };
    }
  },

  async stream(env: Env, req: ProviderChatRequest): Promise<Response> {
    // OpenRouter uses OpenAI format: system is a message with role: 'system'
    const messages = req.system
      ? [{ role: 'system' as const, content: req.system }, ...req.messages]
      : req.messages;

    return fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        // Optional: identify your app (helps OpenRouter analytics)
        'HTTP-Referer': env.PAGES_ORIGIN || 'https://hearthstone.example',
        'X-Title': 'Hearthstone',
      },
      body: JSON.stringify({
        model: req.model,
        messages,
        max_tokens: req.max_tokens ?? 4096,
        stream: true,
      }),
    });
  },
};
