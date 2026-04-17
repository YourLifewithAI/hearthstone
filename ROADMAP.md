# Hearthstone Roadmap

*A mobile Claude companion that knows your context.*

---

## What is Hearthstone?

Hearthstone is a small web app that gives you a version of Claude on your phone that already knows who you are, what you're working on, and how you like to communicate. No re-explaining yourself at the start of every conversation.

It's built as a **Progressive Web App (PWA)** — you add it to your home screen and it looks and feels like a native app, but you never go near an app store.

The trick is a thin **Cloudflare Worker** that sits between your phone and Anthropic's API. The Worker holds your Anthropic API key (so it never ends up in your browser) and prepends a block of context to every message — a "system prompt" assembled from plain text files you've decided are important.

Those context files can be anything: a paragraph about you, your current projects, your writing style, your health goals, an ongoing story you're drafting. Whatever helps Claude be useful to *you*.

---

## The Experience

**First open:** You paste a key you set up yourself. Stored in browser localStorage.

**Every open after:** The app opens in under a second. Tap Chat, type, stream back.

**Offline:** The app shell loads (you can see your last conversation). New messages queue for when you're back online.

**On any device:** Conversations persist in the cloud. Start a thread on the couch, finish it on the train.

---

## Design Principles

1. **Your data, your files.** Context files live on your machine. You push snapshots to the cloud when they change. No scraping, no implicit sync.

2. **Nothing touches your API key but the Worker.** The browser never sees your Anthropic credentials. If a phone gets compromised, you rotate a throwaway bearer token, not a billable API key.

3. **Cheap to run.** Cloudflare Workers, Pages, and KV all have generous free tiers. Your only marginal cost is Anthropic token usage, which is metered and predictable.

4. **Build it once, modify it forever.** Everything is TypeScript + React + standard tools. No proprietary frameworks. Read the code, change the code.

5. **Respect the phone.** Mobile-first layout, touch targets sized for thumbs, streaming responses so you see the first word fast.

---

## Phase 0 — The Core Loop *(~2–3 hours of setup)*

This is what makes it useful.

- Cloudflare Worker that proxies Anthropic's streaming chat API
- React PWA with a Chat screen, installable to your home screen
- Script that uploads your context files to Cloudflare KV
- Conversation history saved server-side (so it syncs across devices)
- Dashboard showing basic state: last context snapshot, conversation count
- First-run setup: paste your key, start chatting
- Settings screen: reset key, clear cache, view config

**Success looks like:** You open the app on your phone, ask "what should I work on today?", and Claude gives you a specific answer grounded in your actual projects and priorities.

**What you'll have after Phase 0:**
- `your-app.pages.dev` — the PWA
- `your-api.your-subdomain.workers.dev` — the Worker
- A working chat with context injection
- About $0–3/month cost depending on usage

---

## Phase 1 — Make It Yours *(optional, anytime)*

Small quality-of-life additions once the core works.

- **Scheduled context refresh.** Instead of manually running the snapshot script, set up a cron job (local or cloud) that pushes updated files daily.
- **Conversation search.** Full-text search across your history.
- **Multiple conversation modes.** Toggle between "quick Haiku" and "deep Sonnet" or pin a specific mode per conversation.
- **Context mode triggers.** The system prompt swaps in different context files when you mention certain keywords.
- **Reset/export.** Download all your conversations as JSON.
- **Webhooks in.** A `/notify` endpoint that lets other services leave you messages visible in the app.

---

## Phase 2 — The Village *(aspirational)*

The aesthetic version. Replace the Dashboard grid with a pixel-art village where each building represents a project, conversation, or context area. Tap the library to see your notes. Tap the forge to see active projects. Walk around.

Completely cosmetic, but it's the kind of delight that makes you want to open the app.

Build assets with [Aseprite](https://www.aseprite.org/) or free pixel art kits. Animate with CSS or a tiny canvas game loop. Stardew-Valley-adjacent vibes.

---

## Phase 3 — Command Layer *(for the power-user path)*

If you want your phone to trigger actions back on your machines:

- Wire the Worker to a message queue (Cloudflare Queues, free tier sufficient)
- A daemon on your laptop/desktop pulls from the queue
- The app can now say "fire a webhook," "start a deploy," "ping a URL every hour until it returns 200"
- Pairs naturally with scheduled Claude agents if you have them

Not needed for the core chat experience. Fun if you have a homelab.

---

## Cost Expectations

| Component | Tier | Typical monthly cost |
|-----------|------|---------------------|
| Cloudflare Workers | Free tier | $0 (100k requests/day) |
| Cloudflare Pages | Free tier | $0 (unlimited bandwidth) |
| Cloudflare KV | Free tier | $0 (100k reads, 1k writes, 1GB storage) |
| Anthropic API (Sonnet, casual use) | Pay per token | $1–5 |
| Anthropic API (heavy use) | Pay per token | $10–30 |
| Domain (optional) | If you want a pretty URL | $10–15/year |

The only thing you'll actually pay is Anthropic tokens. Everything else is well within free tiers for a single user.

**A rough token estimate:** A chat with full context injected costs ~$0.05 per turn on Sonnet 4.5 (around 15k input tokens + 1k output). 20 messages a day = ~$30/month heavy use. If you're lighter, you'll spend much less.

---

## What Hearthstone Is *Not*

- **Not a replacement for claude.ai.** For complex long-form work, the full Claude web UI (with Artifacts, Projects, longer context windows) is still better. Hearthstone is the *always-with-you* companion.
- **Not a CRM or knowledge graph.** It's a prompt-builder with a pretty UI.
- **Not a team tool.** Single-user by design. Multi-user means auth, which means complexity, which defeats the point.
- **Not magic.** If your context files are vague, Claude's responses will be vague. Garbage in, garbage out.

---

## Getting Started

Read **BUILD.md** next. It walks you through Phase 0 from scratch — every account, every command, every file.
