# Adapters

Hearthstone's Worker routes every chat through a **Provider** abstraction. Three providers ship in the box, and adding a new one takes about 50 lines of TypeScript.

## Built-in providers

| Provider | What it is | When to use |
|----------|-----------|-------------|
| **OpenRouter** | OpenAI-compatible gateway to 300+ models (Anthropic, OpenAI, Google, Meta, Mistral, DeepSeek, and more) | Default. One key, every model. ~5% markup unless you BYOK. |
| **Anthropic Direct** | Direct connection to Anthropic's Messages API | If you only want Claude, slightly cheaper than OpenRouter without BYOK. |
| **Local Relay** | A server you run yourself. Hearthstone doesn't care what's behind it. | Local models (Ollama), custom gateways (LiteLLM), privacy-sensitive workloads. |

## Provider selection

The PWA's **Settings → Providers** panel shows each provider with a status dot (green = reachable, gray = not configured or unreachable). Pick one, or pick **Auto** to let the Worker prefer Local when it's up and fall back to OpenRouter otherwise.

The Chat screen has a provider/model picker in the header so you can switch per conversation.

---

## Recommended setup: OpenRouter + BYOK

OpenRouter is the easiest path to "all models, one key" but they take a ~5% markup on paid models. The BYOK (Bring Your Own Keys) pattern eliminates that:

1. Sign up at [openrouter.ai](https://openrouter.ai/).
2. Generate an OpenRouter API key. This is the key you give to Hearthstone's Worker.
3. Visit **[OpenRouter Settings → Integrations](https://openrouter.ai/settings/integrations)**.
4. Add your own Anthropic API key, OpenAI API key, Google AI Studio key, etc. — whichever providers you use.
5. When Hearthstone sends a request with model `anthropic/claude-sonnet-4-5`, OpenRouter routes it through **your** Anthropic key. You pay Anthropic directly at standard API rates. OpenRouter takes zero markup on BYOK traffic.

The PWA's Settings screen surfaces this tip directly so users don't miss it.

### What BYOK is NOT

- It does **not** use your Claude Pro, Claude Max, or ChatGPT Plus subscription. Those subscriptions only cover each company's consumer apps (claude.ai, chatgpt.com). API usage is metered separately.
- It does **not** eliminate token costs — you're still paying each provider per token, just directly rather than through OpenRouter's markup.

---

## Local Relay: bring your own backend

The Local Relay slot lets you plug in **any** HTTP endpoint that speaks a simple protocol:

**Request** (from Worker to Relay):

```
POST /chat
Authorization: Bearer <LOCAL_RELAY_TOKEN>  (optional)
Content-Type: application/json

{
  "messages": [{"role": "user", "content": "..."}, ...],
  "system": "system prompt string",
  "model": "some-model-id",
  "max_tokens": 4096,
  "stream": true
}
```

**Response**: `text/event-stream` in either Anthropic-native or OpenAI-compatible format. The PWA parses both.

**Health**:

```
GET /health
Authorization: Bearer <LOCAL_RELAY_TOKEN>  (optional)
```

Should return 200 OK when the relay is ready. The Worker pings this every 30 seconds (cached) to show the green dot.

### Popular backends

| Tool | What it is | Good for |
|------|-----------|----------|
| [**Ollama**](https://ollama.com/) | Run Llama, Qwen, DeepSeek, etc. on your own machine | Free, private, good enough for most conversations |
| [**LiteLLM Proxy**](https://docs.litellm.ai/docs/proxy/quick_start) | OpenAI-compatible proxy for any provider, with caching and logging | Unified observability, rate limiting, multi-provider with failover |
| [**Claude Agent SDK**](https://docs.anthropic.com/en/docs/claude-code/sdk) | Anthropic's official SDK, supports OAuth auth via Claude Code | ⚠️ Using subscription quota from a third-party app is ToS-gray. Your account, your call. |
| **Your own code** | Spin up anything that speaks the protocol above | Custom logic, custom context, fun |

### Exposing the relay to your phone

Your phone won't be on your home network all the time. Use a tunnel:

- [**Cloudflare Tunnel**](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) — free, integrates with the same Cloudflare account you're already using
- [**Tailscale**](https://tailscale.com/) — free for personal use, zero-config VPN
- [**ngrok**](https://ngrok.com/) — quick and dirty, free tier available

Point Hearthstone's `LOCAL_RELAY_URL` secret at the tunneled URL.

---

## Adding a new provider

Create a new file in `api/src/lib/providers/`:

```typescript
// api/src/lib/providers/groq.ts
import type { Provider, ProviderChatRequest, HealthResult } from './types';
import type { Env } from '../../types';

export const groqProvider: Provider = {
  id: 'groq',
  label: 'Groq',

  isConfigured(env): boolean {
    return !!env.GROQ_API_KEY;
  },

  async healthCheck(env): Promise<HealthResult> {
    if (!env.GROQ_API_KEY) return { healthy: false, detail: 'GROQ_API_KEY not set' };
    // Optionally ping Groq's models endpoint to verify the key
    return { healthy: true };
  },

  async stream(env, req: ProviderChatRequest) {
    const messages = req.system
      ? [{ role: 'system', content: req.system }, ...req.messages]
      : req.messages;
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: req.model,
        messages,
        max_tokens: req.max_tokens ?? 4096,
        stream: true,
      }),
    });
  },
};
```

Register it in `api/src/lib/providers/index.ts`:

```typescript
import { groqProvider } from './groq';
export const PROVIDERS = {
  openrouter: openrouterProvider,
  anthropic: anthropicProvider,
  local: localProvider,
  groq: groqProvider,  // <— new
};
```

Add the env var to `api/src/types.ts`:

```typescript
export interface Env {
  // existing
  GROQ_API_KEY: string;  // <— new
}
```

Add models to `providers/types.ts` in the `MODELS` catalog, set the secret (`wrangler secret put GROQ_API_KEY`), and deploy. The PWA picks it up automatically on next `/providers/status` call.

---

## Protocol quirks

### Streaming formats

Hearthstone's PWA understands two SSE dialects:

- **Anthropic-native**: `event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}`
- **OpenAI-compatible**: `data: {"choices":[{"delta":{"content":"..."}}]}`

Your adapter can return either. Most providers are OpenAI-compatible by default; Anthropic's API is the exception.

### CORS

The Worker's CORS layer handles cross-origin preflight for the PWA. Provider adapters don't need to worry about CORS — they're server-to-server fetches.

### Rate limits

Cloudflare Workers free tier: 100k requests/day. Anthropic/OpenAI/etc. have their own per-key limits. If you hit them, OpenRouter's auto-fallback can route to a different underlying model.
