/**
 * Conversation routes — cross-device conversation history.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Conversation, ConversationMessage } from '../types';
import { listConversations, getConversation, putConversation } from '../lib/kv';

export const conversationRoutes = new Hono<{ Bindings: Env }>();

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  timestamp: z.string().optional(),
});

const createSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  messages: z.array(messageSchema).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  messages: z.array(messageSchema).min(1),
});

function nowIso(): string {
  return new Date().toISOString();
}

function titleFromMessages(messages: ConversationMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'New conversation';
  const text = firstUser.content.replace(/\s+/g, ' ').trim();
  return text.length > 60 ? text.slice(0, 57) + '...' : text;
}

conversationRoutes.get('/', async (c) => {
  const conversations = await listConversations(c.env.HEARTHSTONE_KV);
  return c.json({ conversations });
});

conversationRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const messages: ConversationMessage[] = (parsed.data.messages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp ?? nowIso(),
  }));
  const title = parsed.data.title ?? titleFromMessages(messages);

  const conversation: Conversation = {
    id: crypto.randomUUID(),
    title,
    created_at: nowIso(),
    updated_at: nowIso(),
    messages,
  };

  await putConversation(c.env.HEARTHSTONE_KV, conversation);
  return c.json({ conversation }, 201);
});

conversationRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const conversation = await getConversation(c.env.HEARTHSTONE_KV, id);
  if (!conversation) return c.json({ error: 'not_found' }, 404);
  return c.json({ conversation });
});

conversationRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const existing = await getConversation(c.env.HEARTHSTONE_KV, id);
  if (!existing) return c.json({ error: 'not_found' }, 404);

  const normalized: ConversationMessage[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp ?? nowIso(),
  }));

  const updated: Conversation = {
    ...existing,
    title: parsed.data.title ?? existing.title,
    messages: normalized,
    updated_at: nowIso(),
  };

  await putConversation(c.env.HEARTHSTONE_KV, updated);
  return c.json({ conversation: updated });
});
