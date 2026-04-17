/**
 * Typed fetch wrappers for the Hearthstone Worker API.
 */

import { API_BASE, getApiKey } from './config';
import type {
  Conversation,
  ConversationSummary,
  ConversationMessage,
  ContextStatus,
} from './types';
import { cacheState, readCachedState } from './db';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const key = getApiKey();
  if (!key) throw new ApiError(401, 'API key not set');

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${key}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok && init.method !== 'POST') {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text.slice(0, 200));
  }
  return res;
}

// ─── Context status ────────────────────────────────────────────────────────────
export async function fetchContextStatus(): Promise<ContextStatus> {
  try {
    const res = await apiFetch('/context/status');
    const data = (await res.json()) as ContextStatus;
    await cacheState('ctx_status', data);
    return data;
  } catch (err) {
    const cached = await readCachedState<ContextStatus>('ctx_status');
    if (cached) return cached;
    throw err;
  }
}

// ─── Conversations ──────────────────────────────────────────────────────────────
export async function fetchConversations(): Promise<ConversationSummary[]> {
  const res = await apiFetch('/conversations');
  const body = (await res.json()) as { conversations: ConversationSummary[] };
  return body.conversations;
}

export async function fetchConversation(id: string): Promise<Conversation> {
  const res = await apiFetch(`/conversations/${id}`);
  const body = (await res.json()) as { conversation: Conversation };
  return body.conversation;
}

export async function createConversation(
  messages: ConversationMessage[],
  title?: string
): Promise<Conversation> {
  const res = await apiFetch('/conversations', {
    method: 'POST',
    body: JSON.stringify({ messages, title }),
  });
  const body = (await res.json()) as { conversation: Conversation };
  return body.conversation;
}

export async function updateConversation(
  id: string,
  messages: ConversationMessage[]
): Promise<Conversation> {
  const res = await apiFetch(`/conversations/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ messages }),
  });
  const body = (await res.json()) as { conversation: Conversation };
  return body.conversation;
}

// ─── Chat (streaming) ────────────────────────────────────────────────────────────
export interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  conversation_id?: string;
  model?: 'sonnet' | 'haiku' | 'opus';
}

export async function* streamChat(req: ChatRequest): AsyncGenerator<string> {
  const key = getApiKey();
  if (!key) throw new ApiError(401, 'API key not set');

  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text.slice(0, 200));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const event of events) {
        const delta = parseSSEEvent(event);
        if (delta) yield delta;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSSEEvent(event: string): string | null {
  const lines = event.split('\n');
  let dataLine: string | null = null;
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      dataLine = line.slice(6);
      break;
    }
  }
  if (!dataLine) return null;

  try {
    const data = JSON.parse(dataLine);
    if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
      return data.delta.text as string;
    }
  } catch {
    // malformed event — ignore
  }
  return null;
}
