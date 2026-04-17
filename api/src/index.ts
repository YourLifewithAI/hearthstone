/**
 * Hearthstone API — personal Claude Worker.
 *
 * Routes:
 *   GET  /health                   — liveness (no auth)
 *   GET  /providers                — provider list with health status
 *   GET  /providers/status         — alias of /providers
 *   POST /providers/refresh        — force health re-check
 *   POST /context/snapshot         — batch write context files
 *   GET  /context/status           — last snapshot metadata
 *   GET  /conversations            — list summaries
 *   POST /conversations            — create
 *   GET  /conversations/:id        — full conversation
 *   PUT  /conversations/:id        — replace messages
 *   POST /chat                     — streaming provider proxy
 *
 * Auth: Bearer HEARTHSTONE_API_KEY on all routes except /health.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

import { contextRoutes } from './routes/context';
import { conversationRoutes } from './routes/conversations';
import { chatRoutes } from './routes/chat';
import { providerRoutes } from './routes/providers';

const app = new Hono<{ Bindings: Env }>();

app.use('*', (c, next) => {
  return cors({
    origin: [c.env.PAGES_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Hearthstone-Provider', 'X-Hearthstone-Model', 'X-Conversation-Id'],
    maxAge: 600,
  })(c, next);
});

app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'hearthstone-api', version: '0.2.0' })
);

app.use('*', async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token !== c.env.HEARTHSTONE_API_KEY) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
});

app.route('/providers', providerRoutes);
app.route('/context', contextRoutes);
app.route('/conversations', conversationRoutes);
app.route('/chat', chatRoutes);

app.notFound((c) => c.json({ error: 'not_found', path: c.req.path }, 404));

app.onError((err, c) => {
  console.error('[hearthstone-api]', err);
  return c.json({ error: 'internal_error', message: err.message }, 500);
});

export default app;
