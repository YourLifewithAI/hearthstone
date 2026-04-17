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
