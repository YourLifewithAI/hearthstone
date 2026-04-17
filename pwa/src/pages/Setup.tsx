import { useState, type FormEvent } from 'react';
import { setApiKey } from '../config';

export function Setup({ onReady }: { onReady: () => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  function save(e: FormEvent) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError('API key required');
      return;
    }
    setApiKey(trimmed);
    onReady();
  }

  return (
    <div className="min-h-[100svh] flex items-center justify-center px-6">
      <form onSubmit={save} className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Hearthstone</h1>
          <p className="text-sm text-slate-400 mt-1">
            Paste your Hearthstone API key to begin.
          </p>
        </div>

        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="64-char hex token"
          autoComplete="off"
          className="w-full bg-slate-800 text-slate-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          className="w-full h-11 rounded-lg bg-purple-700 text-white text-sm font-medium active:bg-purple-800"
        >
          Connect
        </button>

        <p className="text-[11px] text-slate-500 text-center">
          Stored locally in your browser. Clear browser data to reset.
        </p>
      </form>
    </div>
  );
}
