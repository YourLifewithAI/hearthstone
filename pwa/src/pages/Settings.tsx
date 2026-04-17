import { useState } from 'react';
import { getApiKey, setApiKey, clearApiKey, API_BASE } from '../config';

function maskKey(k: string | null): string {
  if (!k) return '(not set)';
  if (k.length <= 12) return '••••' + k.slice(-4);
  return k.slice(0, 4) + '…' + k.slice(-4) + `  (${k.length} chars)`;
}

export function Settings() {
  const [current, setCurrent] = useState(() => getApiKey());
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  function saveKey() {
    const trimmed = draft.trim().replace(/[\s\r\n]/g, '');
    if (!trimmed) {
      setStatus('Key was empty.');
      return;
    }
    setApiKey(trimmed);
    setCurrent(trimmed);
    setDraft('');
    setStatus('Saved.');
  }

  function reset() {
    clearApiKey();
    setCurrent(null);
    setStatus('Cleared. Reload to see setup screen.');
  }

  async function nukeCache() {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    setStatus('Caches cleared. Reloading...');
    setTimeout(() => window.location.reload(), 800);
  }

  return (
    <div className="pb-20 px-4 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Settings</h1>
        <p className="text-xs text-slate-500 mt-1 break-all">API: {API_BASE || '(not configured)'}</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-[10px] uppercase tracking-wider text-slate-500">
          Current API key
        </h2>
        <p className="text-sm text-slate-300 font-mono">{maskKey(current)}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-[10px] uppercase tracking-wider text-slate-500">
          Replace key
        </h2>
        <input
          type="password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste new key"
          autoComplete="off"
          className="w-full bg-slate-800 text-slate-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          type="button"
          onClick={saveKey}
          disabled={!draft.trim()}
          className="w-full h-11 rounded-lg bg-purple-700 text-white text-sm font-medium disabled:opacity-40 active:bg-purple-800"
        >
          Save new key
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-[10px] uppercase tracking-wider text-slate-500">
          Troubleshooting
        </h2>
        <button
          type="button"
          onClick={nukeCache}
          className="w-full h-11 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm active:bg-slate-700"
        >
          Clear cache + service worker + reload
        </button>
        <button
          type="button"
          onClick={reset}
          className="w-full h-11 rounded-lg bg-red-900/40 border border-red-800 text-red-200 text-sm active:bg-red-900/60"
        >
          Forget API key
        </button>
      </section>

      {status && (
        <div className="px-3 py-2 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300">
          {status}
        </div>
      )}
    </div>
  );
}
