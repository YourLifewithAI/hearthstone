import { useEffect, useState } from 'react';
import {
  getApiKey,
  setApiKey,
  clearApiKey,
  API_BASE,
  getProviderChoice,
  setProviderChoice,
} from '../config';
import { fetchProvidersStatus } from '../api';
import type { ProviderChoice, ProvidersResponse } from '../types';
import { relativeTime } from '../lib/time';

function maskKey(k: string | null): string {
  if (!k) return '(not set)';
  if (k.length <= 12) return '••••' + k.slice(-4);
  return k.slice(0, 4) + '…' + k.slice(-4) + `  (${k.length} chars)`;
}

export function Settings() {
  const [current, setCurrent] = useState(() => getApiKey());
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [provider, setProviderState] = useState<ProviderChoice>(getProviderChoice());
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProvidersStatus().then(setProviders).catch(() => {});
  }, []);

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

  function chooseProvider(choice: ProviderChoice) {
    setProviderState(choice);
    setProviderChoice(choice);
    setStatus(`Default provider set to ${choice}.`);
  }

  async function refreshProviders() {
    setRefreshing(true);
    try {
      const result = await fetchProvidersStatus({ refresh: true });
      setProviders(result);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="pb-20 px-4 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">Settings</h1>
        <p className="text-xs text-slate-500 mt-1 break-all">API: {API_BASE || '(not configured)'}</p>
      </div>

      {/* Providers */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] uppercase tracking-wider text-slate-500">Providers</h2>
          <button
            type="button"
            onClick={refreshProviders}
            disabled={refreshing}
            className="text-[10px] text-slate-400 disabled:opacity-50"
          >
            {refreshing ? 'checking…' : 'refresh'}
          </button>
        </div>

        <div className="space-y-1.5">
          <ProviderRow
            id="auto"
            label="Auto"
            subtitle="Prefer Local if reachable, else OpenRouter, else Anthropic"
            configured
            healthy
            active={provider === 'auto'}
            onClick={() => chooseProvider('auto')}
          />
          {providers?.providers.map((p) => (
            <ProviderRow
              key={p.id}
              id={p.id}
              label={p.label}
              subtitle={
                !p.configured
                  ? 'Not configured (missing secret)'
                  : p.healthy
                    ? p.checked_at
                      ? `Healthy · ${relativeTime(new Date(p.checked_at).toISOString())}`
                      : 'Healthy'
                    : p.detail ?? 'Unreachable'
              }
              configured={p.configured}
              healthy={p.healthy}
              active={provider === p.id}
              onClick={() => p.configured && chooseProvider(p.id as ProviderChoice)}
            />
          ))}
        </div>
      </section>

      {/* BYOK tip */}
      <section className="px-3 py-3 bg-purple-950/30 border border-purple-900/50 rounded-lg space-y-1">
        <h3 className="text-xs font-medium text-purple-200">💡 Keep costs low with BYOK</h3>
        <p className="text-[11px] text-purple-200/80 leading-relaxed">
          Using OpenRouter? Add your own Anthropic/OpenAI/etc. keys in your{' '}
          <a
            href="https://openrouter.ai/settings/integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-purple-100"
          >
            OpenRouter dashboard
          </a>
          . Requests will route through your own provider keys at standard API rates, skipping OpenRouter's ~5% markup.
        </p>
      </section>

      {/* Current API key */}
      <section className="space-y-2">
        <h2 className="text-[10px] uppercase tracking-wider text-slate-500">
          Current API key
        </h2>
        <p className="text-sm text-slate-300 font-mono">{maskKey(current)}</p>
      </section>

      {/* Replace key */}
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

      {/* Troubleshooting */}
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

function ProviderRow(props: {
  id: string;
  label: string;
  subtitle: string;
  configured: boolean;
  healthy: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const { label, subtitle, configured, healthy, active, onClick } = props;
  const dotColor = !configured
    ? 'bg-slate-600'
    : healthy
      ? 'bg-green-400'
      : 'bg-slate-500';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!configured}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left ${
        active
          ? 'bg-purple-900/40 border-purple-700'
          : 'bg-slate-800 border-slate-700'
      } ${!configured ? 'opacity-50' : 'active:bg-slate-700'}`}
    >
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-100">{label}</div>
        <div className="text-[11px] text-slate-400 truncate">{subtitle}</div>
      </div>
      {active && <span className="text-xs text-purple-300">✓</span>}
    </button>
  );
}
