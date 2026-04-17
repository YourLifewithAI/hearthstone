# Building Hearthstone

*Phase 0 — deploy your own personal Claude PWA from this repo.*

Estimated time: **2–3 hours** (most of which is account signup + waiting for deploys).

---

## Table of Contents

1. [Accounts & software you'll need](#1-accounts--software-youll-need)
2. [Clone the repo](#2-clone-the-repo)
3. [Deploy the Worker (backend)](#3-deploy-the-worker-backend)
4. [Deploy the PWA (frontend)](#4-deploy-the-pwa-frontend)
5. [Write your context files](#5-write-your-context-files)
6. [Upload context + first test](#6-upload-context--first-test)
7. [Install on your phone](#7-install-on-your-phone)
8. [Day-to-day usage](#8-day-to-day-usage)
9. [Troubleshooting](#9-troubleshooting)
10. [Customizing](#10-customizing)

---

## 1. Accounts & software you'll need

### Accounts (free to create)

| Service | Purpose | Cost |
|---------|---------|------|
| [Cloudflare](https://dash.cloudflare.com/sign-up) | Hosts the Worker, the PWA, and the KV store | Free tier is plenty |
| [OpenRouter](https://openrouter.ai/) | **Recommended default provider.** One API, 300+ models. | Pay per token, ~5% markup over direct provider rates (BYOK to skip the markup) |
| [Anthropic Console](https://console.anthropic.com/) | Optional. Only if you want to use Anthropic directly instead of (or in addition to) OpenRouter. | Pay per token |

You don't need all three accounts to get started — you only need one provider configured. **OpenRouter is the easiest** because you can experiment with Claude, GPT, Gemini, Llama, and DeepSeek from a single key.

### Local software

| Tool | Purpose | Download |
|------|---------|----------|
| **Node.js 20+** | JS runtime | [nodejs.org](https://nodejs.org/) — LTS version |
| **Git** | Clone this repo | [git-scm.com](https://git-scm.com/) |
| **A code editor** | Edit config + context files | [VS Code](https://code.visualstudio.com/) is fine |
| **A terminal** | Run commands | macOS: Terminal. Windows: [Windows Terminal](https://apps.microsoft.com/detail/9n0dx20hk701) or PowerShell. Linux: whatever you have. |

### Libraries (auto-installed by npm)

**Worker:** [TypeScript](https://www.typescriptlang.org/), [Hono](https://hono.dev/), [Zod](https://zod.dev/), [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

**PWA:** [React 19](https://react.dev/), [Vite 7](https://vite.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [vite-plugin-pwa](https://vite-pwa-org.netlify.app/), [Workbox](https://developers.google.com/web/tools/workbox), [Dexie.js](https://dexie.org/), [React Router 7](https://reactrouter.com/).

### APIs used

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) — serverless compute
- [Cloudflare Pages](https://developers.cloudflare.com/pages/) — static site hosting
- [Cloudflare KV](https://developers.cloudflare.com/kv/) — key-value storage
- [OpenRouter API](https://openrouter.ai/docs) — LLM gateway (OpenAI-compatible)
- [Anthropic Messages API](https://docs.anthropic.com/en/api/messages) — optional direct-Anthropic path

---

## 2. Clone the repo

```bash
git clone https://github.com/YourLifewithAI/hearthstone.git
cd hearthstone
```

Structure:

```
hearthstone/
├── api/          # Cloudflare Worker (backend)
├── pwa/          # React PWA (frontend)
├── context/      # Your personal context files (you'll create these)
├── scripts/      # Shell scripts to upload context
└── *.md          # Docs
```

---

## 3. Deploy the Worker (backend)

```bash
cd api
npm install
cp wrangler.toml.example wrangler.toml
```

### 3.1 Log in to Cloudflare

```bash
npx wrangler login
```

Browser opens. Click Authorize.

### 3.2 Register a workers.dev subdomain (first-timers only)

If this is your first Cloudflare Worker, open [dash.cloudflare.com](https://dash.cloudflare.com) → **Compute → Workers & Pages**. There's a one-time prompt to register a `*.workers.dev` subdomain. Pick something short.

### 3.3 Create the KV namespace

```bash
npx wrangler kv namespace create HEARTHSTONE_KV
```

It prints an ID. Paste it into `wrangler.toml` where it says `PASTE_KV_NAMESPACE_ID_HERE`.

### 3.4 Get your provider API key(s)

**OpenRouter (recommended):**
1. Visit [openrouter.ai](https://openrouter.ai/) → Sign in → Keys → **Create Key**.
2. Copy the key (`sk-or-v1-...`). Save in your password manager.
3. (Highly recommended) Visit [openrouter.ai/settings/integrations](https://openrouter.ai/settings/integrations) and add your own Anthropic/OpenAI/etc. keys. Now OpenRouter will route through **your** keys at zero markup. See [ADAPTERS.md](./ADAPTERS.md#recommended-setup-openrouter--byok).

**Anthropic Direct (optional):**
1. Visit [console.anthropic.com](https://console.anthropic.com/) → API keys → **Create key**.
2. Copy the key (`sk-ant-api03-...`). Save in your password manager.

### 3.5 Create your Hearthstone bearer token

This is the password the PWA uses to talk to the Worker. Generate a random 64-char hex string.

**macOS/Linux:**
```bash
openssl rand -hex 32
```

**Windows PowerShell:**
```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[BitConverter]::ToString($bytes) -replace '-', ''
```

**Save this in your password manager too.**

### 3.6 Set the Worker secrets

Copy each secret to clipboard, then pipe to wrangler:

```bash
# macOS/Linux:
pbpaste | npx wrangler secret put HEARTHSTONE_API_KEY
pbpaste | npx wrangler secret put OPENROUTER_API_KEY
# Optional extras:
pbpaste | npx wrangler secret put ANTHROPIC_API_KEY
pbpaste | npx wrangler secret put LOCAL_RELAY_URL
pbpaste | npx wrangler secret put LOCAL_RELAY_TOKEN

# Windows PowerShell:
Get-Clipboard | npx wrangler secret put HEARTHSTONE_API_KEY
Get-Clipboard | npx wrangler secret put OPENROUTER_API_KEY
# Optional:
Get-Clipboard | npx wrangler secret put ANTHROPIC_API_KEY
Get-Clipboard | npx wrangler secret put LOCAL_RELAY_URL
Get-Clipboard | npx wrangler secret put LOCAL_RELAY_TOKEN
```

At minimum: `HEARTHSTONE_API_KEY` + one provider. The rest are optional and can be added later.

### 3.7 Deploy

```bash
npx wrangler deploy
```

Look for:
```
  https://hearthstone-api.yourname.workers.dev
```

Test:
```bash
curl https://hearthstone-api.yourname.workers.dev/health
# → {"status":"ok","service":"hearthstone-api","version":"0.2.0"}
```

🎉 **Backend is live.**

---

## 4. Deploy the PWA (frontend)

```bash
cd ../pwa
npm install
cp .env.example .env
```

Edit `.env`:

```
VITE_API_BASE=https://hearthstone-api.yourname.workers.dev
```

### 4.1 Add app icons

Create two PNGs: `public/icon-192.png` (192×192) and `public/icon-512.png` (512×512). [realfavicongenerator.net](https://realfavicongenerator.net/) generates both from any uploaded image.

### 4.2 Build

```bash
npm run build
```

### 4.3 Create Cloudflare Pages project

```bash
npx wrangler pages project create hearthstone --production-branch=main
```

It prints your Pages URL. Note if it added a random suffix (e.g. `hearthstone-xyz.pages.dev`).

### 4.4 Update Worker CORS to allow the Pages URL

Open `../api/wrangler.toml` and set:

```toml
PAGES_ORIGIN = "https://your-actual-pages-url.pages.dev"
```

Redeploy the Worker:

```bash
cd ../api
npx wrangler deploy
cd ../pwa
```

### 4.5 Deploy the PWA

```bash
npx wrangler pages deploy dist --project-name=hearthstone --branch=main
```

🎉 **Frontend is live.**

---

## 5. Write your context files

```bash
cd ..
cp context/about.md.example context/about.md
cp context/projects.md.example context/projects.md
cp context/style.md.example context/style.md
cp context/notes.md.example context/notes.md
```

Open each in your editor and **replace the template content with your own.** The `.example` files have guiding prompts. Take 20–30 minutes on this — it shapes every conversation you'll have.

The real `.md` files are gitignored so you don't accidentally commit personal context.

---

## 6. Upload context + first test

Set env vars:

**macOS/Linux:**
```bash
export HEARTHSTONE_API_KEY="your-64-char-hex-token"
export HEARTHSTONE_API_URL="https://hearthstone-api.yourname.workers.dev"
```

**Windows PowerShell:**
```powershell
$env:HEARTHSTONE_API_KEY = "your-64-char-hex-token"
$env:HEARTHSTONE_API_URL = "https://hearthstone-api.yourname.workers.dev"
```

Run the snapshot:

**macOS/Linux:**
```bash
chmod +x scripts/snapshot.sh
./scripts/snapshot.sh
```

**Windows PowerShell:**
```powershell
.\scripts\snapshot.ps1
```

### Test in the browser

Open your Pages URL. Paste your HEARTHSTONE_API_KEY.

Go to **Settings**. You should see your providers listed with a green dot next to each configured one (OpenRouter, Anthropic Direct, or both). The **BYOK tip** banner explains how to reduce costs — take a minute to read it and configure BYOK in your OpenRouter dashboard if you haven't yet.

Go to **Chat**. The model picker in the header lets you switch models. Send: "What do you know about me?"

If Claude (or whichever model) references your context, **Phase 0 is done.**

---

## 7. Install on your phone

1. Open your Pages URL in **Safari** (iOS) or **Chrome** (Android).
2. **iOS:** Tap Share → Add to Home Screen.
   **Android:** Tap menu → Install app.
3. Open from home screen — launches standalone.
4. Paste your `HEARTHSTONE_API_KEY` when prompted.
5. Settings → verify providers show green dots.
6. Chat.

---

## 8. Day-to-day usage

### Updating context

Any time your `context/*.md` files change, re-run the snapshot script. Takes 2 seconds. No redeploy needed.

Schedule it daily: see crontab / Task Scheduler examples in the Troubleshooting section.

### Switching providers on the fly

The model picker in the Chat header lets you switch mid-conversation. Settings → Providers lets you change your default (or pick Auto).

### Rotating the Hearthstone bearer token

```bash
echo "new-64-char-hex" | npx wrangler secret put HEARTHSTONE_API_KEY
```

Then in the PWA → Settings → Replace key.

### Running a Local Relay

See [ADAPTERS.md](./ADAPTERS.md#local-relay-bring-your-own-backend). Short version: stand up Ollama, LiteLLM, or a custom endpoint; expose it via Cloudflare Tunnel; set `LOCAL_RELAY_URL` on the Worker. Green dot appears when it's reachable.

---

## 9. Troubleshooting

### "Unauthorized" when sending a chat

- Key in PWA doesn't match Worker's. Settings → check key length (should be 64). Re-paste if not.
- Stale service worker. Settings → "Clear cache + service worker + reload."

### "Failed to fetch" / "Load failed"

- PWA hitting wrong Worker URL. Check `pwa/.env` has the right `VITE_API_BASE` and rebuild.
- CORS. `PAGES_ORIGIN` in `api/wrangler.toml` must match your Pages URL exactly. Redeploy Worker after any change.

### Worker deployed but "Page not found"

- Register a workers.dev subdomain (step 3.2).
- `workers_dev = true` must be in `wrangler.toml`.

### All providers show gray dots

- None of the provider secrets are configured, or they're wrong. Run `wrangler secret list` inside `api/` to see what's set.
- For OpenRouter, verify your key at [openrouter.ai/keys](https://openrouter.ai/keys).

### Chat works but response doesn't use context

- Run the snapshot script. Check `/context/status` returns non-null `meta`.
- Context files might be empty. Open them and verify.

### Snapshot script fails with JSON validation error

- The shipped scripts handle PowerShell's JSON-wrapping quirk and UTF-8 BOM stripping. If you modified them, make sure you're reading raw bytes, decoding UTF8, and stripping BOM.

### PWA won't install on iOS

- Must be HTTPS (Pages is by default).
- Manifest needs 192 and 512 icons.
- Try a hard reload first.

### Provider-specific errors

- **401 OpenRouter**: Key wrong, or your OpenRouter account has no credits. Deposit funds at [openrouter.ai/credits](https://openrouter.ai/credits) or use free-tier models.
- **401 Anthropic**: Key wrong. Re-run `wrangler secret put ANTHROPIC_API_KEY`.
- **429**: Rate limit. Wait 30 seconds, or switch providers in the model picker.
- **400**: Usually too-long context. Trim your files.

### Streaming cuts off

- Some ad blockers / VPNs break SSE. Disable and retry.
- Corporate networks sometimes buffer. Try on cellular.

### Cost concerns

- OpenRouter: Set a daily/monthly spending limit in your dashboard.
- Anthropic: Set a monthly spending limit in [console.anthropic.com](https://console.anthropic.com/) → Settings → Limits.
- Pre-buy credits rather than attaching a card if you want a hard cap.

---

## 10. Customizing

### Change the context sections

Edit `api/src/types.ts`:

```typescript
export const CTX_KEYS = ['about', 'projects', 'style', 'notes'] as const;
```

Add or remove keys. Update `CTX_TTL` and `CTX_TITLES` in the same file. Update `scripts/snapshot.ps1` and `scripts/snapshot.sh` to include your new file names.

Redeploy the Worker.

### Change the default provider

Edit `pwa/src/config.ts`:

```typescript
export function getProviderChoice(): ProviderChoice {
  const v = localStorage.getItem(PROVIDER_STORAGE);
  // ...
  return 'auto';  // change to 'openrouter', 'anthropic', or 'local'
}
```

Rebuild + redeploy PWA.

### Add a new provider

See [ADAPTERS.md](./ADAPTERS.md#adding-a-new-provider). About 50 lines of TypeScript plus an entry in the registry.

### Change the color theme

Edit `pwa/src/index.css` (Tailwind 4 CSS-first config):

```css
@theme {
  --color-bg: #your-color;
  --color-accent: #your-color;
}
```

### Scheduled daily context refresh

- **macOS/Linux:** `crontab -e`:
  ```
  0 7 * * * HEARTHSTONE_API_KEY="..." HEARTHSTONE_API_URL="..." /path/to/hearthstone/scripts/snapshot.sh
  ```
- **Windows:** Task Scheduler running `powershell.exe -File snapshot.ps1`.

---

## What you've built

- A personal Claude that carries your context
- Multi-provider: switch between OpenRouter, Anthropic, local models at will
- Installable PWA on any phone
- No API keys in the browser
- Conversations synced across devices
- ~$0–5/month running cost (less if you use free-tier models)
- Readable codebase you can modify

Read [ROADMAP.md](./ROADMAP.md) for Phase 1+ ideas. [ADAPTERS.md](./ADAPTERS.md) for deep provider customization.

Have fun.
