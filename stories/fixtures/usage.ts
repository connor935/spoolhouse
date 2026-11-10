import type { UsageRow } from '@/lib/usage-stats';

// Usage figures from the Statistics / Overview / Material detail boards
// (.claude/design), shaped like `UsageStats` (lib/usage-stats.ts).

export type MonthlyPoint = { month: string; grams: number; costCents: number };

const PER_GRAM_CENTS = 2.352; // Oct 2026: 1,620 g · €38.10

function months(grams: number[]): MonthlyPoint[] {
  return grams.map((g, i) => {
    const d = new Date(Date.UTC(2025, 11 + i, 1));
    return {
      month: d.toISOString().slice(0, 7),
      grams: g,
      costCents: Math.round(g * PER_GRAM_CENTS),
    };
  });
}

/** Dec 2025 – Nov 2026, 12.83 kg; peak 1.62 kg in October, Nov month to date. */
export const monthlyUsage = months([
  817, 1142, 962, 1378, 1212, 741, 692, 1052, 1523, 1288, 1620, 408,
]);

/** One material (Galaxy Black), peak 520 g in September. */
export const materialMonthlyUsage = months([
  139, 215, 191, 312, 243, 97, 118, 229, 520, 361, 333, 104,
]);

/** Tracking started in September: the earlier months are zero. */
export const newUserMonthlyUsage = months([
  0, 0, 0, 0, 0, 0, 0, 0, 0, 240, 610, 95,
]);

export const emptyMonthlyUsage = months(Array(12).fill(0));

export type MaterialRunwayRow = UsageRow & { filamentType?: string };

/** "By material" table, already in the order the board shows. */
export const byMaterial: MaterialRunwayRow[] = [
  row('cyan', 'Basic Cyan', '#0086D6', 'PLA', 640, 142, 21),
  row('orange', 'Prusa Orange', '#F26B21', 'PETG', 1480, 741, 42),
  row('white', 'Cotton White', '#ECEAE3', 'PLA', 520, 410, 70),
  row('black', 'Galaxy Black', '#22242A', 'PLA', 980, 2160, 180),
  row('red', 'Fire Engine Red', '#C8102E', 'PETG', 140, 560, 360),
  row('mint', 'Mint', '#9ADBC0', 'PLA', 310, 1380, 400),
  row('gold', 'Silk Gold', '#C9A23F', 'PLA', 0, 1885, null),
  row('graphite', 'Graphite', '#4A4E54', 'ASA', 0, 812, null),
];

/** "By filament type" table. */
export const byType: UsageRow[] = [
  {
    key: 'PETG',
    label: 'PETG',
    usedLast90Grams: 1620,
    leftGrams: 1301,
    forecastDays: 72,
  },
  {
    key: 'PLA',
    label: 'PLA',
    usedLast90Grams: 2450,
    leftGrams: 5977,
    forecastDays: 220,
  },
  {
    key: 'ASA',
    label: 'ASA',
    usedLast90Grams: 0,
    leftGrams: 812,
    forecastDays: null,
  },
];

/** Stock composition, 8.09 kg. */
export const stockByType = [
  { type: 'PLA', grams: 5977 },
  { type: 'PETG', grams: 1301 },
  { type: 'ASA', grams: 812 },
];

function row(
  key: string,
  label: string,
  color: string,
  filamentType: string,
  usedLast90Grams: number,
  leftGrams: number,
  forecastDays: number | null
): MaterialRunwayRow {
  return {
    key,
    label,
    color,
    filamentType,
    usedLast90Grams,
    leftGrams,
    forecastDays,
  };
}
