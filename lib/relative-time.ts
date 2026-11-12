const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Compact age for dense tables and review metadata: "just now", "5 min ago",
 * "2 h ago", "3 d ago", "2 mo ago", "1 y ago". Floors each unit, so the label
 * never overstates the age.
 */
export function formatAgoShort(date: Date, now: Date): string {
  const ms = now.getTime() - date.getTime();
  if (ms < MINUTE_MS) return 'just now';
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)} min ago`;
  if (ms < DAY_MS) return `${Math.floor(ms / HOUR_MS)} h ago`;
  const days = Math.floor(ms / DAY_MS);
  if (days < 30) return `${days} d ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} y ago`;
}
