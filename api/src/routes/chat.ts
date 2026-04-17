/**
 * Chat route — streaming Anthropic proxy.
 *
 * POST /chat
 * Body: { messages: [{role, content}], model?: 'sonnet'|'haiku'|'opus', conversation_id?: string }
 * Returns: text/event-stream (Anthropic SSE passed through)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types';
import { streamAnthropicChat, resolveModel } from '../lib/anthropic';
import { buildSystemPrompt } from '../lib/prompt';

export const chatRoutes = new Hono<{ Bindings: Env }>();

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      })
    )
    .min(1),
  model: z.enum(['sonnet', 'haiku', 'opus']).optional(),
  conversation_id: z.string().optional(),
  max_tokens: z.number().int().min(1).max(8192).optional(),
});

chatRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const { messages, model, conversation_id, max_tokens } = parsed.data;

  if (!c.env.ANTHROPIC_API_KEY) {
    return c.json(
      { error: 'anthropic_not_configured', message: 'ANTHROPIC_API_KEY secret not set' },
      503
    );
  }

  const systemPrompt = await buildSystemPrompt(c.env.HEARTHSTONE_KV);

  const upstream = await streamAnthropicChat(
    c.env.ANTHROPIC_API_KEY,
    messages,
    systemPrompt,
    {
      model: resolveModel(model),
      max_tokens,
    }
  );

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text().catch(() => '');
    return c.json(
      {
        error: 'anthropic_error',
        status: upstream.status,
        message: errorText.slice(0, 500),
      },
      502
    );
  }

  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (conversation_id) headers.set('X-Conversation-Id', conversation_id);

  return new Response(upstream.body, { headers });
});
