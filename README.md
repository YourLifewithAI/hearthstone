# Hearthstone

A personal Claude PWA for your phone. Carries your context with you. **Now with multi-provider support** — route through OpenRouter, Anthropic directly, or your own local server.

![Phase](https://img.shields.io/badge/Phase%200-live-success) ![Providers](https://img.shields.io/badge/providers-3-purple) ![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Cloudflare%20Workers-blue)

---

## What it is

A small web app that gives you a version of Claude (or GPT, Gemini, Llama, DeepSeek, anything) on your phone that already knows who you are, what you're working on, and how you like to communicate. No re-explaining yourself at the start of every conversation.

Install it to your home screen and it behaves like a native app, but everything is open TypeScript — read the code, change the code. It's built on [Cloudflare Workers](https://developers.cloudflare.com/workers/) (backend) and [Cloudflare Pages](https://developers.cloudflare.com/pages/) (frontend).

## Provider options

The Worker can route your chat through any of three providers, switchable in-app:

- **OpenRouter** (default) — OpenAI-compatible gateway to 300+ models. One key, every model. Combine with [BYOK](./ADAPTERS.md#recommended-setup-openrouter--byok) to skip OpenRouter's ~5% markup.
- **Anthropic Direct** — Straight to Anthropic's Messages API if you only want Claude.
- **Local Relay** — A server you run yourself (Ollama, LiteLLM, custom). Your phone shows a green dot when it's reachable.

Adding a new provider takes ~50 lines of TypeScript. See [ADAPTERS.md](./ADAPTERS.md).

## Architecture

```
Phone (PWA)  ←→  Hearthstone Worker  ←→  OpenRouter / Anthropic / Local Relay
                       ↕
                 Cloudflare KV (context + conversations)
                       ↑
                 scripts/snapshot.sh (push context files)
```

- **`api/`** — Hono + TypeScript Cloudflare Worker. Provider registry, streaming proxy, context injection.
- **`pwa/`** — React 19 + Vite 7 + Tailwind 4 PWA. Provider picker with health dots, model selector, installable.
- **`context/`** — Your personal markdown files (gitignored).
- **`scripts/`** — Shell scripts to upload context to KV.

## Get started

1. [**ROADMAP.md**](./ROADMAP.md) — understand what this is and what it costs.
2. [**BUILD.md**](./BUILD.md) — deploy your own, step by step.
3. [**ADAPTERS.md**](./ADAPTERS.md) — swap in new providers, BYOK, run a local relay.

Estimated setup time: **2–3 hours**. Most of it is waiting for deploys.

## Cost

Free tier on Cloudflare covers a single user comfortably. Marginal cost is LLM tokens:

- **Free models** via OpenRouter (DeepSeek V3, Llama 3.3, Gemini 2.0 Flash exp.) — $0, rate-limited
- **Casual Sonnet 4.5 use** — $1–5/month
- **Heavy Sonnet 4.5 use** — $10–30/month

Set a monthly spending cap in the OpenRouter or Anthropic dashboard either way.

## Core design principles

1. **Your data, your files.** Context lives on your machine.
2. **Nothing touches your API key but the Worker.** The browser never sees provider credentials.
3. **Provider-agnostic by default.** Default model can change tomorrow and your PWA doesn't care.
4. **Cheap to run.** Everything free-tier except metered token usage.
5. **Build it once, modify it forever.** Standard tools, no magic.

## License

MIT. Use it, fork it, modify it.
