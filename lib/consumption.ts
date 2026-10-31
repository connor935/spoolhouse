// Filament usage derived from the weighing history. Pure (no DB) so the
// stats page, the material dialog and the tests share one definition.
//
// Usage is the sum of weight DROPS between consecutive weighings of the same
// spool. Increases are ignored: they are corrections (a mistyped low value
// re-weighed properly) or a refilled spool, never negative consumption. A
// mistyped value that is fixed by "undo" instead leaves no trace, which is why
// undo deletes the weighing rather than adding a corrective one.

export type WeighingPoint = {
  spoolId: string;
  grams: number;
  measuredAt: Date;
};
export type UsageEvent = { spoolId: string; at: Date; grams: number };

const DAY_MS = 24 * 60 * 60 * 1000;

export function usageEvents(points: WeighingPoint[]): UsageEvent[] {
  const bySpool = new Map<string, WeighingPoint[]>();
  for (const p of points) {
    const list = bySpool.get(p.spoolId) ?? [];
    list.push(p);
    bySpool.set(p.spoolId, list);
  }
  const events: UsageEvent[] = [];
  for (const [spoolId, list] of bySpool) {
    list.sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
    for (let i = 1; i < list.length; i++) {
      const drop = list[i - 1].grams - list[i].grams;
      if (drop > 0)
        events.push({ spoolId, at: list[i].measuredAt, grams: drop });
    }
  }
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function sumGrams(events: UsageEvent[]): number {
  return events.reduce((sum, e) => sum + e.grams, 0);
}

export function eventsSince(events: UsageEvent[], since: Date): UsageEvent[] {
  return events.filter((e) => e.at.getTime() > since.getTime());
}

// 'YYYY-MM' in UTC — the server renders the stats page, so a fixed zone keeps
// month boundaries stable regardless of where it runs.
export function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

// The last `months` calendar months (oldest first, current month last), each
// with its usage — months without any usage are present with 0.
export function monthlyUsage(
  events: UsageEvent[],
  months: number,
  now: Date,
  weight: (e: UsageEvent) => number = (e) => e.grams
): { month: string; value: number }[] {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)
    );
    keys.push(monthKey(d));
  }
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const e of events) {
    const k = monthKey(e.at);
    if (totals.has(k)) totals.set(k, totals.get(k)! + weight(e));
  }
  return keys.map((month) => ({ month, value: totals.get(month)! }));
}

// Average grams per day over the last `windowDays`, or over the time since
// tracking began when that is shorter — but never fewer than MIN_WINDOW_DAYS,
// so a single weighing the day after the deploy doesn't extrapolate wildly.
const MIN_WINDOW_DAYS = 7;

export function dailyRate(
  events: UsageEvent[],
  now: Date,
  trackedSince: Date,
  windowDays = 60
): number {
  const trackedDays = (now.getTime() - trackedSince.getTime()) / DAY_MS;
  const days = Math.max(MIN_WINDOW_DAYS, Math.min(windowDays, trackedDays));
  const since = new Date(now.getTime() - days * DAY_MS);
  return sumGrams(eventsSince(events, since)) / days;
}

// Days until `leftGrams` runs out at `gramsPerDay`; null when nothing is being
// used (no forecast rather than "infinite").
export function forecastDays(
  leftGrams: number,
  gramsPerDay: number
): number | null {
  if (gramsPerDay <= 0) return null;
  return leftGrams / gramsPerDay;
}

export function formatDays(days: number): string {
  if (days < 1) return 'less than a day';
  if (days < 14) {
    const d = Math.round(days);
    return `${d} day${d === 1 ? '' : 's'}`;
  }
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  if (days < 730) return `${Math.round(days / 30)} months`;
  return 'over 2 years';
}
