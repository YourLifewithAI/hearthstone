const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '?';
  const diff = Date.now() - ts;
  if (diff < MIN) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  return `${Math.floor(diff / DAY)}d ago`;
}
