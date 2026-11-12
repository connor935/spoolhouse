// Roll-ups for the Overview page (`/`). Pure, so the page, its stories and the
// tests share one definition; the usage events come from lib/consumption.ts.
import { eventsSince, forecastDays, sumGrams } from '@/lib/consumption';
import type { UsageEvent } from '@/lib/consumption';
import type { Material } from '@/lib/db/schema';
import type { MaterialInventory, SpoolView } from '@/lib/filament';

const DAY_MS = 24 * 60 * 60 * 1000;

export type UsageDelta = {
  last30Grams: number;
  prev30Grams: number;
  /** Whole percent change against the previous 30 days; null without usage then. */
  deltaPct: number | null;
};

// "Used · 30 days" readout: the last 30 days against the 30 days before.
export function usageDelta(events: UsageEvent[], now: Date): UsageDelta {
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const since60 = new Date(now.getTime() - 60 * DAY_MS);
  const last30Grams = sumGrams(eventsSince(events, since30));
  const prev30Grams = sumGrams(eventsSince(events, since60)) - last30Grams;
  return {
    last30Grams,
    prev30Grams,
    deltaPct:
      prev30Grams > 0
        ? Math.round(((last30Grams - prev30Grams) / prev30Grams) * 100)
        : null,
  };
}

export type StockSummary = {
  inStock: number;
  total: number;
  low: number;
  empty: number;
  leftGrams: number;
  /** Materials / filament types with at least one spool in stock. */
  materials: number;
  types: number;
};

export function stockSummary(inventory: MaterialInventory[]): StockSummary {
  const summary: StockSummary = {
    inStock: 0,
    total: 0,
    low: 0,
    empty: 0,
    leftGrams: 0,
    materials: 0,
    types: 0,
  };
  const types = new Set<string>();
  for (const { material, spools } of inventory) {
    const stocked = spools.filter((s) => !s.isEmpty);
    summary.total += spools.length;
    summary.inStock += stocked.length;
    summary.empty += spools.length - stocked.length;
    summary.low += stocked.filter((s) => s.isLow).length;
    summary.leftGrams += stocked.reduce((g, s) => g + s.filamentLeftGrams, 0);
    if (stocked.length > 0) {
      summary.materials += 1;
      types.add(material.filamentType);
    }
  }
  summary.types = types.size;
  return summary;
}

export type StockValue = {
  /** Value of the filament left on priced spools, whole cents. */
  cents: number;
  priced: number;
  stocked: number;
};

export function stockValue(inventory: MaterialInventory[]): StockValue {
  const stocked = inventory.flatMap((m) => m.spools).filter((s) => !s.isEmpty);
  const priced = stocked.filter((s) => s.valueLeftCents !== null);
  return {
    cents: Math.round(priced.reduce((sum, s) => sum + s.valueLeftCents!, 0)),
    priced: priced.length,
    stocked: stocked.length,
  };
}

/** A spool with its oldest-first number within its material (#01 …). */
export type NumberedSpool = { spool: SpoolView; number: number };

export type RunningLowRow = {
  material: Material;
  /** In-stock spools only. */
  spools: NumberedSpool[];
  leftGrams: number;
  isLow: boolean;
  forecastDays: number | null;
};

// A material makes the "Running low" list when it runs out within this many
// days at its current pace, or when one of its spools is already low.
export const RUNNING_LOW_DAYS = 90;

export function runningLow(
  inventory: MaterialInventory[],
  gramsPerDayByMaterial: Readonly<Record<string, number>>,
  limit = 5
): RunningLowRow[] {
  const rows: RunningLowRow[] = [];
  for (const { material, spools } of inventory) {
    const stocked = numbered(spools).filter(({ spool }) => !spool.isEmpty);
    if (stocked.length === 0) continue;
    const leftGrams = stocked.reduce(
      (g, s) => g + s.spool.filamentLeftGrams,
      0
    );
    const days = forecastDays(
      leftGrams,
      gramsPerDayByMaterial[material.id] ?? 0
    );
    const isLow = stocked.some(({ spool }) => spool.isLow);
    if (!isLow && (days === null || days > RUNNING_LOW_DAYS)) continue;
    rows.push({
      material,
      spools: stocked,
      leftGrams,
      isLow,
      forecastDays: days,
    });
  }
  return rows
    .sort(
      (a, b) =>
        (a.forecastDays ?? Infinity) - (b.forecastDays ?? Infinity) ||
        a.leftGrams - b.leftGrams
    )
    .slice(0, limit);
}

export type DryingRow = NumberedSpool & {
  material: Material;
  daysSinceDried: number;
  neverDried: boolean;
};

// "Needs drying": spools with the Dry? hint, longest overdue first.
export function dryingList(
  inventory: MaterialInventory[],
  now: Date
): DryingRow[] {
  return inventory
    .flatMap(({ material, spools }) =>
      numbered(spools)
        .filter(({ spool }) => spool.needsDrying)
        .map(({ spool, number }) => ({
          spool,
          number,
          material,
          neverDried: spool.lastDriedAt === null,
          daysSinceDried: Math.floor(
            (now.getTime() - (spool.lastDriedAt ?? spool.createdAt).getTime()) /
              DAY_MS
          ),
        }))
    )
    .sort((a, b) => b.daysSinceDried - a.daysSinceDried);
}

// Spools arrive oldest-first from groupInventory(), which is what numbers them.
function numbered(spools: SpoolView[]): NumberedSpool[] {
  return spools.map((spool, i) => ({ spool, number: i + 1 }));
}
