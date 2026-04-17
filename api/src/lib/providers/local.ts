/**
 * Local Relay provider — a server YOU run.
 *
 * The relay accepts POST at {LOCAL_RELAY_URL}/chat with body:
 *   { messages, system, model, max_tokens }
 * and returns SSE in either Anthropic or OpenAI-compatible format.
 * The PWA parses both.
 *
 * Optional: a {LOCAL_RELAY_URL}/health endpoint for status checks.
 * Optional: LOCAL_RELAY_TOKEN for bearer auth on the relay.
 *
 * What you can put behind the relay:
 *   - Ollama running locally (llama, qwen, deepseek, etc.)
 *   - LiteLLM proxy (any provider unified)
 *   - Claude Agent SDK with OAuth (subscription quota — ToS gray, your call)
 *   - A custom backend
 */

import type { Provider, ProviderChatRequest, HealthResult } from './types';
import type { Env } from '../../types';

export const localProvider: Provider = {
  id: 'local',
  label: 'Local Relay',

  isConfigured(env: Env): boolean {
    return !!env.LOCAL_RELAY_URL;
  },

  async healthCheck(env: Env): Promise<HealthResult> {
    if (!env.LOCAL_RELAY_URL) {
      return { healthy: false, detail: 'LOCAL_RELAY_URL not set' };
    }
    try {
      const headers: Record<string, string> = {};
      if (env.LOCAL_RELAY_TOKEN) {
        headers.Authorization = `Bearer ${env.LOCAL_RELAY_TOKEN}`;
      }
      const res = await fetch(`${env.LOCAL_RELAY_URL.replace(/\/$/, '')}/health`, {
        headers,
        signal: AbortSignal.timeout(3000),
      });
      return res.ok
        ? { healthy: true }
        : { healthy: false, detail: `HTTP ${res.status}` };
    } catch (err) {
      return { healthy: false, detail: (err as Error).message };
    }
  },

  async stream(env: Env, req: ProviderChatRequest): Promise<Response> {
    if (!env.LOCAL_RELAY_URL) {
      throw new Error('LOCAL_RELAY_URL not set');
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (env.LOCAL_RELAY_TOKEN) {
      headers.Authorization = `Bearer ${env.LOCAL_RELAY_TOKEN}`;
    }
    return fetch(`${env.LOCAL_RELAY_URL.replace(/\/$/, '')}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: req.messages,
        system: req.system,
        model: req.model,
        max_tokens: req.max_tokens ?? 4096,
        stream: true,
      }),
    });
  },
};
