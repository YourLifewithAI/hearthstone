# Hearthstone API (Worker)

Cloudflare Worker that proxies Anthropic's Messages API and holds your context in KV.

## Setup

```bash
cp wrangler.toml.example wrangler.toml
npm install
npx wrangler login
npx wrangler kv namespace create HEARTHSTONE_KV
# Paste the namespace ID into wrangler.toml

# Set your secrets:
echo "sk-ant-api03-..." | npx wrangler secret put ANTHROPIC_API_KEY
echo "your-64-char-hex-token" | npx wrangler secret put HEARTHSTONE_API_KEY

npx wrangler deploy
```

See `../BUILD.md` for the full walkthrough.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness (no auth) |
| POST | `/context/snapshot` | Upload context files to KV |
| GET | `/context/status` | Last snapshot metadata |
| GET | `/conversations` | List conversation summaries |
| POST | `/conversations` | Create new conversation |
| GET | `/conversations/:id` | Full conversation |
| PUT | `/conversations/:id` | Replace messages |
| POST | `/chat` | Streaming Anthropic proxy (SSE) |

All routes except `/health` require `Authorization: Bearer <HEARTHSTONE_API_KEY>`.
