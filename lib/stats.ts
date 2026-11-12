// Roll-ups for the Statistics page (`/stats`). Pure, so lib/usage-stats.ts,
// the page's stories and the tests share one definition.
import {
  dailyRate,
  eventsSince,
  forecastDays,
  sumGrams,
  type UsageEvent,
} from '@/lib/consumption';
import type { MaterialInventory } from '@/lib/filament';

const DAY_MS = 24 * 60 * 60 * 1000;

export type UsageRow = {
  key: string;
  label: string;
  color?: string | null;
  filamentType?: string;
  usedLast90Grams: number;
  leftGrams: number;
  forecastDays: number | null;
};

type UsageRowsInput = {
  events: UsageEvent[];
  /** The row an event belongs to (same keys as `keyOf`). */
  eventKey: (e: UsageEvent) => string;
  inventory: MaterialInventory[];
  keyOf: (m: MaterialInventory) => string;
  labelOf: (m: MaterialInventory) => string;
  colorOf?: (m: MaterialInventory) => string | null;
  typeOf?: (m: MaterialInventory) => string;
  now: Date;
  /** First weighing ever; null before anything was tracked (no forecasts). */
  trackedSince: Date | null;
};

// "By material" / "By filament type": every row still in stock or used in the
// last 90 days, so idle stock shows up as "No recent use". Runs out first on
// top, rows without a forecast last.
export function usageRows({
  events,
  eventKey,
  inventory,
  keyOf,
  labelOf,
  colorOf,
  typeOf,
  now,
  trackedSince,
}: UsageRowsInput): UsageRow[] {
  const since90 = new Date(now.getTime() - 90 * DAY_MS);
  const byKey = new Map<string, UsageEvent[]>();
  for (const e of events) {
    const k = eventKey(e);
    byKey.set(k, [...(byKey.get(k) ?? []), e]);
  }

  const out = new Map<string, UsageRow>();
  for (const m of inventory) {
    const key = keyOf(m);
    const row = out.get(key) ?? {
      key,
      label: labelOf(m),
      ...(colorOf && { color: colorOf(m) }),
      ...(typeOf && { filamentType: typeOf(m) }),
      usedLast90Grams: 0,
      leftGrams: 0,
      forecastDays: null,
    };
    row.leftGrams += m.totalLeftGrams;
    out.set(key, row);
  }
  for (const row of out.values()) {
    const list = byKey.get(row.key) ?? [];
    row.usedLast90Grams = sumGrams(eventsSince(list, since90));
    row.forecastDays = trackedSince
      ? forecastDays(row.leftGrams, dailyRate(list, now, trackedSince))
      : null;
  }
  return [...out.values()]
    .filter((r) => r.usedLast90Grams > 0 || r.leftGrams > 0)
    .sort(
      (a, b) =>
        (a.forecastDays ?? Infinity) - (b.forecastDays ?? Infinity) ||
        b.usedLast90Grams - a.usedLast90Grams
    );
}

// Stock composition bar: filament left per type, largest first.
export function stockByType(
  inventory: MaterialInventory[]
): { type: string; grams: number }[] {
  const grams = new Map<string, number>();
  for (const m of inventory) {
    const type = m.material.filamentType;
    grams.set(type, (grams.get(type) ?? 0) + m.totalLeftGrams);
  }
  return [...grams]
    .map(([type, g]) => ({ type, grams: g }))
    .filter((s) => s.grams > 0)
    .sort((a, b) => b.grams - a.grams);
}
