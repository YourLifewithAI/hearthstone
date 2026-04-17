# Hearthstone PWA

React 19 + Vite 7 + Tailwind 4 + Dexie.js. Installable to phone home screen.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: set VITE_API_BASE to your Worker URL
```

## Dev

```bash
npm run dev
# http://localhost:5173
```

## Build + deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=hearthstone --branch=main
```

See `../BUILD.md` for the full walkthrough.

## Screens

- **Setup** (first run) — paste Hearthstone API key
- **Dashboard** — context snapshot status, conversation stats
- **Chat** — streaming conversation with history drawer
- **Settings** — reset key, clear cache, view config
