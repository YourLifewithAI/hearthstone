/**
 * Shared types and constants.
 *
 * Customize CTX_KEYS to match the context files you want to inject.
 * The order here determines the order of sections in the system prompt.
 */

export interface Env {
  HEARTHSTONE_KV: KVNamespace;
  ANTHROPIC_API_KEY: string;
  HEARTHSTONE_API_KEY: string;
  PAGES_ORIGIN: string;
}

// ─── Context keys ─────────────────────────────────────────────────────────────
// Any short identifier works. These become sections in the system prompt.
// Add/remove keys to fit your life.
export const CTX_KEYS = ['about', 'projects', 'style', 'notes'] as const;
export type CtxKey = typeof CTX_KEYS[number];

// TTL in seconds. Shorter TTLs for files you update often.
export const CTX_TTL: Record<CtxKey, number> = {
  about: 2592000,     // 30d
  projects: 604800,   // 7d
  style: 2592000,     // 30d
  notes: 604800,      // 7d
};

// Human-readable section titles for the system prompt
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
