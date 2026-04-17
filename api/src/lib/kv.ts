/**
 * HEARTHSTONE_KV helpers.
 *
 * Never call kv.list() — free tier is 1,000/day. Use the index key pattern
 * (conv:idx) for listing conversations.
 */

import type {
  Conversation,
  ConversationSummary,
  SnapshotMeta,
} from '../types';

// ─── Context chunks ───────────────────────────────────────────────────────────

export async function getContextChunk(
  kv: KVNamespace,
  key: string
): Promise<string | null> {
  return kv.get(`ctx:${key}`);
}

export async function putContextChunk(
  kv: KVNamespace,
  key: string,
  content: string,
  ttlSeconds: number
): Promise<void> {
  await kv.put(`ctx:${key}`, content, { expirationTtl: ttlSeconds });
}

export async function getSnapshotMeta(kv: KVNamespace): Promise<SnapshotMeta | null> {
  return kv.get<SnapshotMeta>('ctx:snapshot_meta', 'json');
}

export async function putSnapshotMeta(kv: KVNamespace, meta: SnapshotMeta): Promise<void> {
  await kv.put('ctx:snapshot_meta', JSON.stringify(meta), {
    expirationTtl: 2592000, // 30d
  });
}

// ─── Conversations ────────────────────────────────────────────────────────────

const CONV_IDX_KEY = 'conv:idx';
const CONV_TTL = 7776000; // 90d
const CONV_IDX_MAX = 50;

export async function listConversations(kv: KVNamespace): Promise<ConversationSummary[]> {
  const idx = await kv.get<ConversationSummary[]>(CONV_IDX_KEY, 'json');
  return idx ?? [];
}

export async function getConversation(
  kv: KVNamespace,
  id: string
): Promise<Conversation | null> {
  return kv.get<Conversation>(`conv:${id}`, 'json');
}

export async function putConversation(
  kv: KVNamespace,
  conversation: Conversation
): Promise<void> {
  await kv.put(`conv:${conversation.id}`, JSON.stringify(conversation), {
    expirationTtl: CONV_TTL,
  });

  const idx = (await kv.get<ConversationSummary[]>(CONV_IDX_KEY, 'json')) ?? [];
  const summary: ConversationSummary = {
    id: conversation.id,
    title: conversation.title,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    preview: previewOf(conversation),
  };

  const next = [summary, ...idx.filter((s) => s.id !== conversation.id)].slice(0, CONV_IDX_MAX);
  await kv.put(CONV_IDX_KEY, JSON.stringify(next));
}

function previewOf(conversation: Conversation): string {
  const lastUser = [...conversation.messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return '';
  const text = lastUser.content.replace(/\s+/g, ' ').trim();
  return text.length > 120 ? text.slice(0, 117) + '...' : text;
}
