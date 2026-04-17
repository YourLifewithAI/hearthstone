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
  sizes: Record<string, number>;
  version: number;
}

export interface ContextStatus {
  meta: SnapshotMeta | null;
}

// ─── Providers ─────────────────────────────────────────────────────────────────

export type ProviderId = 'openrouter' | 'anthropic' | 'local';
export type ProviderChoice = ProviderId | 'auto';

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  configured: boolean;
  healthy: boolean;
  detail?: string;
  checked_at?: number;
}

export interface ModelInfo {
  alias: string;
  label: string;
  note?: string;
  available_on: string[];
}

export interface ProvidersResponse {
  providers: ProviderStatus[];
  models: ModelInfo[];
}
