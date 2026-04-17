/**
 * Chat route — streaming LLM proxy.
 *
 * POST /chat
 * Body: {
 *   messages: [{role, content}],
 *   provider?: 'openrouter' | 'anthropic' | 'local' | 'auto',  (default: 'auto')
 *   model?: string,                                             (alias or raw id; default: 'sonnet')
 *   conversation_id?: string,
 *   max_tokens?: number,
 * }
 * Returns: text/event-stream (provider SSE passed through)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types';
import { buildSystemPrompt } from '../lib/prompt';
import {
  getProvider,
  resolveAuto,
  resolveModelId,
  PROVIDERS,
} from '../lib/providers';

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
  provider: z.enum(['openrouter', 'anthropic', 'local', 'auto']).optional(),
  model: z.string().optional(),
  conversation_id: z.string().optional(),
  max_tokens: z.number().int().min(1).max(8192).optional(),
});

chatRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const {
    messages,
    provider: providerInput,
    model: modelInput,
    conversation_id,
    max_tokens,
  } = parsed.data;

  const providerId = providerInput ?? 'auto';

  // Resolve provider
  const provider =
    providerId === 'auto'
      ? await resolveAuto(c.env)
      : getProvider(providerId);

  if (!provider) {
    return c.json(
      {
        error: 'no_provider_available',
        message:
          providerId === 'auto'
            ? 'No provider is configured. Set OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or LOCAL_RELAY_URL.'
            : `Provider '${providerId}' not recognized.`,
        configured: Object.entries(PROVIDERS)
          .filter(([, p]) => p.isConfigured(c.env))
          .map(([id]) => id),
      },
      503
    );
  }

  if (!provider.isConfigured(c.env)) {
    return c.json(
      {
        error: 'provider_not_configured',
        provider: provider.id,
        message: `Provider '${provider.id}' is selected but its credentials are not set.`,
      },
      503
    );
  }

  // Resolve model alias → provider-specific ID
  const alias = modelInput ?? 'sonnet';
  const resolvedModel = resolveModelId(
    alias,
    provider.id as 'openrouter' | 'anthropic' | 'local'
  );
  if (!resolvedModel) {
    return c.json(
      {
        error: 'model_unavailable_on_provider',
        provider: provider.id,
        model: alias,
        message: `Model '${alias}' is not available via '${provider.id}'. Pick a different model or provider.`,
      },
      400
    );
  }

  const systemPrompt = await buildSystemPrompt(c.env.HEARTHSTONE_KV);

  let upstream: Response;
  try {
    upstream = await provider.stream(c.env, {
      messages,
      system: systemPrompt,
      model: resolvedModel,
      max_tokens,
    });
  } catch (err) {
    return c.json(
      {
        error: 'provider_error',
        provider: provider.id,
        message: (err as Error).message,
      },
      502
    );
  }

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text().catch(() => '');
    return c.json(
      {
        error: 'upstream_error',
        provider: provider.id,
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
    'X-Hearthstone-Provider': provider.id,
    'X-Hearthstone-Model': resolvedModel,
  });
  if (conversation_id) headers.set('X-Conversation-Id', conversation_id);

  return new Response(upstream.body, { headers });
});
