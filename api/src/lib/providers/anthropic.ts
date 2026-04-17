/**
 * Direct Anthropic Messages API provider.
 * Uses ANTHROPIC_API_KEY secret. SSE format is Anthropic-native.
 */

import type { Provider, ProviderChatRequest, HealthResult } from './types';
import type { Env } from '../../types';

export const anthropicProvider: Provider = {
  id: 'anthropic',
  label: 'Anthropic Direct',

  isConfigured(env: Env): boolean {
    return !!env.ANTHROPIC_API_KEY;
  },

  async healthCheck(env: Env): Promise<HealthResult> {
    // Anthropic has no lightweight auth-check endpoint; trust a configured key.
    return env.ANTHROPIC_API_KEY
      ? { healthy: true }
      : { healthy: false, detail: 'ANTHROPIC_API_KEY not set' };
  },

  async stream(env: Env, req: ProviderChatRequest): Promise<Response> {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: req.model,
        max_tokens: req.max_tokens ?? 4096,
        system: req.system,
        messages: req.messages,
        stream: true,
      }),
    });
  },
};
