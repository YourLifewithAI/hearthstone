# Building Hearthstone

*Phase 0 — deploy your own personal Claude PWA from this repo.*

Estimated time: **2–3 hours** (most of which is account signup + waiting for deploys). Skill level: comfortable pasting commands. You don't need to be a developer.

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
| [Cloudflare](https://dash.cloudflare.com/sign-up) | Hosts the Worker (backend) and the PWA (frontend), plus KV storage | Free tier is plenty |
| [Anthropic Console](https://console.anthropic.com/) | Your Claude API access | Pay per token, ~$5 buys you a LOT of casual use |

### Local software

| Tool | Purpose | Download |
|------|---------|----------|
| **Node.js 20+** | JS runtime | [nodejs.org](https://nodejs.org/) — LTS version |
| **Git** | Clone this repo | [git-scm.com](https://git-scm.com/) |
| **A code editor** | Edit config + context files | [VS Code](https://code.visualstudio.com/) is fine |
| **A terminal** | Run commands | macOS: Terminal. Windows: [Windows Terminal](https://apps.microsoft.com/detail/9n0dx20hk701) or PowerShell. Linux: whatever you have. |

### Libraries used (auto-installed by npm)

Not something you install yourself — included here so you know what's running:

**Worker stack:**
- [**TypeScript**](https://www.typescriptlang.org/) — typed JavaScript
- [**Hono**](https://hono.dev/) — fast web framework for Cloudflare Workers
- [**Zod**](https://zod.dev/) — runtime schema validation
- [**Wrangler**](https://developers.cloudflare.com/workers/wrangler/) — Cloudflare's deployment CLI

**PWA stack:**
- [**React 19**](https://react.dev/) — UI framework
- [**Vite 7**](https://vite.dev/) — build tool + dev server
- [**Tailwind CSS 4**](https://tailwindcss.com/) — utility-first styling
- [**vite-plugin-pwa**](https://vite-pwa-org.netlify.app/) — service worker + manifest generation
- [**Workbox**](https://developers.google.com/web/tools/workbox) — caching strategy for the service worker (via vite-plugin-pwa)
- [**Dexie.js**](https://dexie.org/) — IndexedDB wrapper for offline storage
- [**React Router 7**](https://reactrouter.com/) — navigation

### APIs used

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) — serverless compute at the edge
- [Cloudflare Pages](https://developers.cloudflare.com/pages/) — static site hosting
- [Cloudflare KV](https://developers.cloudflare.com/kv/) — key-value storage
- [Anthropic Messages API](https://docs.anthropic.com/en/api/messages) — Claude's chat endpoint (streaming SSE)

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

It prints an ID like `id = "abc123..."`. Open `wrangler.toml` and paste that ID where it says `PASTE_KV_NAMESPACE_ID_HERE`.

### 3.4 Create your Anthropic API key

Go to [console.anthropic.com](https://console.anthropic.com/) → Settings → API keys → **Create key**. Name it "Hearthstone." Copy the key (shown only once).

### 3.5 Create your Hearthstone bearer token

This is the password the PWA uses to talk to the Worker. Generate any random 64-char hex string.

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

**Save both keys in your password manager.** You'll need them again.

### 3.6 Set the Worker secrets

Copy your **Anthropic key** to clipboard, then:

```bash
# macOS/Linux:
pbpaste | npx wrangler secret put ANTHROPIC_API_KEY

# Windows PowerShell:
Get-Clipboard | npx wrangler secret put ANTHROPIC_API_KEY
```

Copy your **Hearthstone bearer token** to clipboard, then:

```bash
# macOS/Linux:
pbpaste | npx wrangler secret put HEARTHSTONE_API_KEY

# Windows PowerShell:
Get-Clipboard | npx wrangler secret put HEARTHSTONE_API_KEY
```

### 3.7 Deploy

```bash
npx wrangler deploy
```

Look for a line like:
```
  https://hearthstone-api.yourname.workers.dev
```

That's your Worker URL. Save it. Test:

```bash
curl https://hearthstone-api.yourname.workers.dev/health
# → {"status":"ok","service":"hearthstone-api","version":"0.1.0"}
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

(Use your actual Worker URL from step 3.7.)

### 4.1 Add app icons

Create two PNGs: `public/icon-192.png` (192×192) and `public/icon-512.png` (512×512). Any square image works. Quick option: [realfavicongenerator.net](https://realfavicongenerator.net/) generates a full set from any uploaded image.

### 4.2 Build

```bash
npm run build
```

Should produce a `dist/` folder with no errors.

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

🎉 **Frontend is live** at the Pages URL.

---

## 5. Write your context files

```bash
cd ..
cp context/about.md.example context/about.md
cp context/projects.md.example context/projects.md
cp context/style.md.example context/style.md
cp context/notes.md.example context/notes.md
```

Open each in your editor and **replace the template content with your own.** The `.example` files have guiding prompts. Take 20–30 minutes on this — this is the most important step, and it shapes every conversation you'll have.

The real `.md` files are gitignored so you don't accidentally commit your personal context.

---

## 6. Upload context + first test

Set two env vars (paste your real values):

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

Expected output:
```
  about        1234 chars  ./context/about.md
  projects     2345 chars  ./context/projects.md
  style         567 chars  ./context/style.md
  notes         890 chars  ./context/notes.md

Snapshotting 4 files (5036 total chars)...

Snapshot complete.
  Written:   about, projects, style, notes
  Version:   1
  Timestamp: ...
```

### Test in the browser

Open your Pages URL. Paste your HEARTHSTONE_API_KEY. Tap **Chat**. Send: "What do you know about me?"

If Claude's response references your context, **Phase 0 is done.**

---

## 7. Install on your phone

1. Open your Pages URL in **Safari** (iOS) or **Chrome** (Android).
2. **iOS:** Tap Share → Add to Home Screen.
   **Android:** Tap menu → Install app.
3. Open from home screen. Launches standalone.
4. Paste your `HEARTHSTONE_API_KEY` when prompted.
5. Chat.

---

## 8. Day-to-day usage

### Updating context

Any time your `context/*.md` files change, re-run the snapshot script. Takes 2 seconds. No redeploy needed.

Consider scheduling it daily:

- **macOS/Linux:** `crontab -e`:
  ```
  0 7 * * * HEARTHSTONE_API_KEY="..." HEARTHSTONE_API_URL="..." /path/to/hearthstone/scripts/snapshot.sh
  ```
- **Windows:** [Task Scheduler](https://learn.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page) running `powershell.exe -File snapshot.ps1`.

### Rotating keys

If your bearer token leaks, generate a new one and run:

```bash
echo "new-token-here" | npx wrangler secret put HEARTHSTONE_API_KEY
```

Then in the PWA → Settings → Replace key → paste new one.

---

## 9. Troubleshooting

### "Unauthorized" when sending a chat

- The key stored in the PWA doesn't match the Worker's. Settings → check key length (should be 64). If not, re-paste.
- Old service worker caching a stale bundle. Settings → "Clear cache + service worker + reload."

### "Failed to fetch" / "Load failed"

- PWA is hitting the wrong Worker URL. Check `pwa/.env` has the right `VITE_API_BASE` and rebuild.
- CORS misconfigured. In `api/wrangler.toml`, `PAGES_ORIGIN` must exactly match your Pages URL (no trailing slash). Redeploy the Worker after any change.

### Worker deployed but "Page not found" at the workers.dev URL

- You need to register a workers.dev subdomain once per account (see step 3.2).
- Make sure `workers_dev = true` is in `wrangler.toml`.

### Chat works but response doesn't use context

- Run the snapshot script. Check `/context/status` returns non-null `meta`.
- Your context files might be empty. Open them and verify.

### Snapshot script fails with JSON validation error

- The provided scripts handle PowerShell's JSON-wrapping quirk and UTF-8 BOM stripping. If you're running a modified version, make sure you're reading raw bytes + decoding UTF8 + stripping BOM.

### PWA won't install on iOS

- Must be HTTPS (Pages is by default).
- Manifest needs 192 and 512 icons.
- Try a hard reload first.

### Anthropic errors

- `401`: Anthropic key wrong. Re-run `wrangler secret put ANTHROPIC_API_KEY`.
- `429`: Rate limit. Wait 30 seconds.
- `400`: Usually too-long context. Trim your files.

### Streaming cuts off

- Some ad blockers / VPNs break SSE. Disable and retry.
- Corporate networks sometimes buffer. Try on cellular.

### Cost concerns

- Only Anthropic charges per token. Check [console.anthropic.com](https://console.anthropic.com/) usage dashboard.
- Set a monthly spending limit in Anthropic settings.
- Pre-buy credits rather than attaching a card if you want a hard cap.

---

## 10. Customizing

### Change the context sections

Edit `api/src/types.ts`:

```typescript
export const CTX_KEYS = ['about', 'projects', 'style', 'notes'] as const;
```

Add or remove keys. Update `CTX_TTL` and `CTX_TITLES` in the same file. Then update `scripts/snapshot.ps1` and `scripts/snapshot.sh` to include your new file names.

Redeploy the Worker (`npx wrangler deploy` from `api/`).

### Change the color theme

Edit `pwa/src/index.css` (Tailwind 4 CSS-first config):

```css
@theme {
  --color-bg: #your-color;
  --color-accent: #your-color;
  ...
}
```

### Change the default model

Edit `api/src/lib/anthropic.ts`:

```typescript
const MODEL_ALIASES: Record<string, string> = {
  sonnet: 'claude-sonnet-4-5',  // or whatever you prefer
  ...
};
```

### Add a scheduled daily context refresh

See the cron example in section 8. Recommended: 4am local time so context is fresh when you wake up.

---

## What you've built

- A personal Claude that carries your context
- Installable PWA on any phone
- No API keys in the browser — secure by default
- Conversations synced across devices
- ~$0–5/month running cost
- ~600 lines of TypeScript you can read and modify

Read [ROADMAP.md](./ROADMAP.md) for Phase 1+ ideas if you want to keep going.

Have fun.
