/**
 * Context snapshot routes.
 *
 * POST /context/snapshot — batch-write context files to KV.
 * GET /context/status — last snapshot metadata.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, CtxKey, SnapshotMeta } from '../types';
import { CTX_KEYS, CTX_TTL } from '../types';
import { putContextChunk, getSnapshotMeta, putSnapshotMeta } from '../lib/kv';

export const contextRoutes = new Hono<{ Bindings: Env }>();

const ctxKeyEnum = z.enum(CTX_KEYS);

const snapshotSchema = z.object({
  files: z
    .array(
      z.object({
        key: ctxKeyEnum,
        content: z.string().min(1).max(200_000),
      })
    )
    .min(1),
});

contextRoutes.post('/snapshot', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = snapshotSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'invalid_body', issues: parsed.error.issues }, 400);
  }

  const sizes: Partial<Record<CtxKey, number>> = {};
  await Promise.all(
    parsed.data.files.map(async ({ key, content }) => {
      await putContextChunk(c.env.HEARTHSTONE_KV, key, content, CTX_TTL[key]);
      sizes[key] = content.length;
    })
  );

  // Merge with existing meta so partial snapshots don't wipe prior sizes
  const existing = await getSnapshotMeta(c.env.HEARTHSTONE_KV);
  const meta: SnapshotMeta = {
    timestamp: new Date().toISOString(),
    sizes: { ...(existing?.sizes ?? {}), ...sizes },
    version: (existing?.version ?? 0) + 1,
  };
  await putSnapshotMeta(c.env.HEARTHSTONE_KV, meta);

  return c.json({ ok: true, written: Object.keys(sizes), meta });
});

contextRoutes.get('/status', async (c) => {
  const meta = await getSnapshotMeta(c.env.HEARTHSTONE_KV);
  return c.json({ meta });
});
