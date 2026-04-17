import { useEffect, useState } from 'react';
import { fetchContextStatus, fetchConversations } from '../api';
import type { ContextStatus, ConversationSummary } from '../types';
import { relativeTime } from '../lib/time';
import { Link } from 'react-router-dom';

const REFRESH_INTERVAL_MS = 60_000;

export function Dashboard() {
  const [ctxStatus, setCtxStatus] = useState<ContextStatus | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const [ctx, convs] = await Promise.all([
        fetchContextStatus(),
        fetchConversations(),
      ]);
      setCtxStatus(ctx);
      setConversations(convs);
      setLastRefresh(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }

  const ctxSizes = ctxStatus?.meta?.sizes ?? {};
  const totalContextChars = Object.values(ctxSizes).reduce((a, b) => a + b, 0);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 bg-slate-900/95 backdrop-blur border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">Hearthstone</h1>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="text-xs text-slate-400 disabled:opacity-50"
        >
          {refreshing ? '…' : lastRefresh ? relativeTime(lastRefresh) : 'refresh'}
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Context status */}
      <section className="px-4 py-4 border-b border-slate-800">
        <h2 className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
          Context
        </h2>
        {ctxStatus?.meta ? (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-200">
                {Object.keys(ctxSizes).length} files · {totalContextChars.toLocaleString()} chars
              </span>
              <span className="text-xs text-slate-400">
                {relativeTime(ctxStatus.meta.timestamp)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ctxSizes).map(([key, size]) => (
                <span
                  key={key}
                  className="text-[10px] px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300"
                >
                  {key} · {size.toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">
            No context uploaded yet. Run the snapshot script.
          </p>
        )}
      </section>

      {/* Conversations */}
      <section className="px-4 py-4">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-[10px] uppercase tracking-wider text-slate-500">
            Recent conversations ({conversations.length})
          </h2>
          <Link to="/chat" className="text-xs text-purple-300">
            + New
          </Link>
        </div>
        {conversations.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            No conversations yet. Tap Chat to start one.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {conversations.slice(0, 10).map((c) => (
              <li
                key={c.id}
                className="px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-slate-100 truncate">
                    {c.title}
                  </span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {relativeTime(c.updated_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{c.preview}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
