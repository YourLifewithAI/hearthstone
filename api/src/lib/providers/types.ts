/**
 * Provider abstraction — any LLM endpoint Hearthstone can route to.
 *
 * The three built-in providers:
 *   - openrouter — OpenAI-compatible gateway to 300+ models (default)
 *   - anthropic  — direct Anthropic Messages API (BYOK path)
 *   - local     — your own relay server (Ollama, LiteLLM, custom, etc.)
 */

import type { Env } from '../../types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProviderChatRequest {
  messages: ChatMessage[];
  system: string;
  model: string;         // provider-specific model ID
  max_tokens?: number;
}

export interface HealthResult {
  healthy: boolean;
  detail?: string;
}

export interface Provider {
  id: string;                          // machine id: 'openrouter' | 'anthropic' | 'local'
  label: string;                       // human label
  isConfigured(env: Env): boolean;     // env has required secrets
  healthCheck(env: Env): Promise<HealthResult>;
  stream(env: Env, req: ProviderChatRequest): Promise<Response>;
}

// ─── Model catalog ───────────────────────────────────────────────────────────
// Short aliases → provider-specific model IDs.
// If an alias isn't in the catalog, it's passed through raw to the provider.

export interface ModelEntry {
  label: string;
  note?: string;
  providers: {
    openrouter: string | null;
    anthropic: string | null;
    local: string | null;  // local relay decides its own mapping
  };
}

export const MODELS: Record<string, ModelEntry> = {
  // Anthropic family
  sonnet: {
    label: 'Claude Sonnet 4.5',
    providers: {
      openrouter: 'anthropic/claude-sonnet-4-5',
      anthropic: 'claude-sonnet-4-5',
      local: 'sonnet',
    },
  },
  haiku: {
    label: 'Claude Haiku 4.5',
    note: 'Fast & cheap',
    providers: {
      openrouter: 'anthropic/claude-haiku-4-5',
      anthropic: 'claude-haiku-4-5',
      local: 'haiku',
    },
  },
  opus: {
    label: 'Claude Opus 4.5',
    note: 'Strongest, costliest',
    providers: {
      openrouter: 'anthropic/claude-opus-4-5',
      anthropic: 'claude-opus-4-5',
      local: 'opus',
    },
  },
  // Other providers via OpenRouter
  'gpt-4o': {
    label: 'GPT-4o',
    providers: {
      openrouter: 'openai/gpt-4o',
      anthropic: null,
      local: 'gpt-4o',
    },
  },
  'gemini-2.5': {
    label: 'Gemini 2.5 Pro',
    providers: {
      openrouter: 'google/gemini-2.5-pro',
      anthropic: null,
      local: 'gemini-2.5',
    },
  },
  deepseek: {
    label: 'DeepSeek V3',
    note: 'Free tier available',
    providers: {
      openrouter: 'deepseek/deepseek-chat',
      anthropic: null,
      local: 'deepseek',
    },
  },
  llama: {
    label: 'Llama 3.3 70B',
    note: 'Free tier available',
    providers: {
      openrouter: 'meta-llama/llama-3.3-70b-instruct',
      anthropic: null,
      local: 'llama',
    },
  },
};

/**
 * Resolve an alias (e.g. 'sonnet') to the model ID for a specific provider.
 * If the alias isn't in the catalog, return it unchanged — users can pass
 * raw model IDs like 'mistralai/mixtral-8x7b-instruct' via OpenRouter.
 */
export function resolveModelId(
  alias: string,
  providerId: 'openrouter' | 'anthropic' | 'local'
): string | null {
  const entry = MODELS[alias];
  if (!entry) return alias; // raw passthrough
  return entry.providers[providerId];
}
