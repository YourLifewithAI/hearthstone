# Hearthstone

A personal Claude PWA for your phone. Carries your context with you.

![Phase](https://img.shields.io/badge/Phase%200-live-success) ![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Cloudflare%20Workers-purple)

---

## What it is

A small web app that gives you a version of Claude on your phone that already knows who you are, what you're working on, and how you like to communicate. No re-explaining yourself at the start of every conversation.

Install it to your home screen and it behaves like a native app, but everything is open TypeScript — read the code, change the code. It's built on [Cloudflare Workers](https://developers.cloudflare.com/workers/) (backend) and [Cloudflare Pages](https://developers.cloudflare.com/pages/) (frontend), using the [Anthropic Messages API](https://docs.anthropic.com/en/api/messages) for Claude.

## Architecture

```
Phone (PWA)  ←→  hearthstone-api Worker  ←→  Anthropic API
                       ↕
                 Cloudflare KV (context + conversations)
                       ↑
                 scripts/snapshot.sh (local: push context files)
```

- **`api/`** — Hono + TypeScript Cloudflare Worker. Proxies Anthropic, holds your API key, builds a system prompt from KV.
- **`pwa/`** — React 19 + Vite 7 + Tailwind 4 PWA. Installable, offline-capable.
- **`context/`** — Your personal markdown files (gitignored).
- **`scripts/`** — Shell scripts to upload context to KV.

## Get started

1. Read [**ROADMAP.md**](./ROADMAP.md) to understand what this is and what it costs.
2. Follow [**BUILD.md**](./BUILD.md) to deploy your own.

Estimated time: **2–3 hours**. Most of that is waiting for installs. You don't need to be a developer, just comfortable pasting commands.

## Cost

Free tier on Cloudflare covers a single user comfortably. The only real cost is Anthropic tokens — typically **$1–5/month** for casual use, up to **~$30/month** if you're chatting heavily. Set a monthly spending cap in the Anthropic console.

## Core design principles

1. **Your data, your files.** Context lives on your machine. You push snapshots to the cloud when they change.
2. **Nothing touches your API key but the Worker.** The browser never sees your Anthropic credentials.
3. **Cheap to run.** Everything free-tier except metered token usage.
4. **Build it once, modify it forever.** Standard tools, no magic.

## License

MIT. Use it, fork it, modify it. No attribution required but appreciated.
