/**
 * Shared types and constants.
 *
 * Customize CTX_KEYS to match the context files you want to inject.
 * The order here determines the order of sections in the system prompt.
 */

export interface Env {
  HEARTHSTONE_KV: KVNamespace;
  HEARTHSTONE_API_KEY: string;

  // Provider credentials (set via `wrangler secret put`).
  // At least one must be configured for chat to work.
  ANTHROPIC_API_KEY: string;          // direct Anthropic
  OPENROUTER_API_KEY: string;         // OpenRouter gateway (recommended default)
  LOCAL_RELAY_URL: string;            // your own relay server (optional)
  LOCAL_RELAY_TOKEN: string;          // bearer auth for relay (optional)

  PAGES_ORIGIN: string;
}

// ─── Context keys ─────────────────────────────────────────────────────────────
export const CTX_KEYS = ['about', 'projects', 'style', 'notes'] as const;
export type CtxKey = typeof CTX_KEYS[number];

export const CTX_TTL: Record<CtxKey, number> = {
  about: 2592000,
  projects: 604800,
  style: 2592000,
  notes: 604800,
};

export const CTX_TITLES: Record<CtxKey, string> = {
  about: 'About the user',
  projects: 'Current projects',
  style: 'Communication style preferences',
  notes: 'Recent notes',
};

// ─── Conversation shapes ──────────────────────────────────────────────────────
export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  preview: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ConversationMessage[];
}

export interface SnapshotMeta {
  timestamp: string;
  sizes: Partial<Record<CtxKey, number>>;
  version: number;
}
