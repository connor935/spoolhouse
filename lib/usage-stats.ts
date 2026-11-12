import 'server-only';

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { materials, spools, spoolWeighings } from '@/lib/db/schema';
import {
  dailyRate,
  eventsSince,
  monthlyUsage,
  sumGrams,
  usageEvents,
  type UsageEvent,
} from '@/lib/consumption';
import { pricePerGramCents, type MaterialInventory } from '@/lib/filament';
import { usageDelta, type UsageDelta } from '@/lib/overview';
import { stockByType, usageRows, type UsageRow } from '@/lib/stats';

// Usage and cost figures from the weighing history of the user's own spools
// (weighings by a borrower count too: it is the spool that empties). Read
// whole — a personal inventory has hundreds to a few thousand weighings.

const DAY_MS = 24 * 60 * 60 * 1000;

type SpoolMeta = {
  materialId: string;
  filamentType: string;
  perGramCents: number | null;
};

async function loadUsage(userId: string) {
  const rows = await db
    .select({
      spoolId: spoolWeighings.spoolId,
      grams: spoolWeighings.grams,
      measuredAt: spoolWeighings.measuredAt,
      materialId: spools.materialId,
      filamentType: materials.filamentType,
      pricePaidCents: spools.pricePaidCents,
      fullFilamentWeightGrams: spools.fullFilamentWeightGrams,
    })
    .from(spoolWeighings)
    .innerJoin(spools, eq(spoolWeighings.spoolId, spools.id))
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .where(eq(spools.userId, userId));

  const meta = new Map<string, SpoolMeta>();
  let trackedSince: Date | null = null;
  for (const r of rows) {
    meta.set(r.spoolId, {
      materialId: r.materialId,
      filamentType: r.filamentType,
      perGramCents: pricePerGramCents(r),
    });
    if (!trackedSince || r.measuredAt < trackedSince)
      trackedSince = r.measuredAt;
  }
  return { events: usageEvents(rows), meta, trackedSince };
}

export type MaterialUsage = {
  usedLast30Grams: number;
  gramsPerDay: number;
};

export type MaterialUsageHistory = MaterialUsage & {
  /** Last 12 months, oldest first, current month last. */
  monthly: { month: string; grams: number; costCents: number }[];
};

// Per material: recent usage and pace, for the inventory's run-out forecasts.
export async function getMaterialUsage(
  userId: string,
  now = new Date()
): Promise<Record<string, MaterialUsage>> {
  const { events, meta, trackedSince } = await loadUsage(userId);
  if (!trackedSince) return {};
  const byMaterial = groupEvents(
    events,
    (e) => meta.get(e.spoolId)!.materialId
  );
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const result: Record<string, MaterialUsage> = {};
  for (const [materialId, list] of byMaterial) {
    result[materialId] = {
      usedLast30Grams: sumGrams(eventsSince(list, since30)),
      gramsPerDay: dailyRate(list, now, trackedSince),
    };
  }
  return result;
}

// One material's usage for its detail page: recent figures plus the
// 12-month chart, from the user's own spools of it.
export async function getMaterialUsageHistory(
  userId: string,
  materialId: string,
  now = new Date()
): Promise<MaterialUsageHistory> {
  const { events, meta, trackedSince } = await loadUsage(userId);
  const list = events.filter(
    (e) => meta.get(e.spoolId)!.materialId === materialId
  );
  const cost = (e: UsageEvent) =>
    e.grams * (meta.get(e.spoolId)?.perGramCents ?? 0);
  const grams12 = monthlyUsage(list, 12, now);
  const cost12 = monthlyUsage(list, 12, now, cost);
  return {
    usedLast30Grams: sumGrams(
      eventsSince(list, new Date(now.getTime() - 30 * DAY_MS))
    ),
    gramsPerDay: trackedSince ? dailyRate(list, now, trackedSince) : 0,
    monthly: grams12.map((m, i) => ({
      month: m.month,
      grams: m.value,
      costCents: cost12[i].value,
    })),
  };
}

export type OverviewUsage = {
  delta: UsageDelta;
  /** Last 12 months, oldest first (UsageBarChart data). */
  monthly: { month: string; grams: number; costCents: number }[];
  /** Pace per material, for the "Running low" forecast. */
  gramsPerDayByMaterial: Record<string, number>;
};

// Overview: the 30-day readout with its delta, the compact monthly chart and
// the per-material pace — one read of the weighing history for all three.
export async function getOverviewUsage(
  userId: string,
  now = new Date()
): Promise<OverviewUsage> {
  const { events, meta, trackedSince } = await loadUsage(userId);
  const cost = (e: UsageEvent) =>
    e.grams * (meta.get(e.spoolId)?.perGramCents ?? 0);
  const grams12 = monthlyUsage(events, 12, now);
  const cost12 = monthlyUsage(events, 12, now, cost);
  const gramsPerDayByMaterial: Record<string, number> = {};
  if (trackedSince) {
    const byMaterial = groupEvents(
      events,
      (e) => meta.get(e.spoolId)!.materialId
    );
    for (const [materialId, list] of byMaterial)
      gramsPerDayByMaterial[materialId] = dailyRate(list, now, trackedSince);
  }
  return {
    delta: usageDelta(events, now),
    monthly: grams12.map((m, i) => ({
      month: m.month,
      grams: m.value,
      costCents: cost12[i].value,
    })),
    gramsPerDayByMaterial,
  };
}

function groupEvents(
  events: UsageEvent[],
  keyOf: (e: UsageEvent) => string
): Map<string, UsageEvent[]> {
  const map = new Map<string, UsageEvent[]>();
  for (const e of events) {
    const k = keyOf(e);
    const list = map.get(k) ?? [];
    list.push(e);
    map.set(k, list);
  }
  return map;
}

export type { UsageRow } from '@/lib/stats';

export type UsageStats = {
  trackedSince: string | null;
  /** "Used · 30 days" with the change against the 30 days before. */
  delta: UsageDelta;
  costLast30Cents: number;
  avgPerMonthGrams: number;
  stockValueCents: number;
  pricedSpools: number;
  stockedSpools: number;
  monthly: { month: string; grams: number; costCents: number }[];
  byType: UsageRow[];
  byMaterial: UsageRow[];
  /** Filament left per type, largest first (stock composition bar). */
  stockByType: { type: string; grams: number }[];
};

export async function getUsageStats(
  userId: string,
  inventory: MaterialInventory[],
  now = new Date()
): Promise<UsageStats> {
  const { events, meta, trackedSince } = await loadUsage(userId);
  const cost = (e: UsageEvent) =>
    e.grams * (meta.get(e.spoolId)?.perGramCents ?? 0);
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const recent = eventsSince(events, since30);

  const stocked = inventory.flatMap((m) => m.spools).filter((s) => !s.isEmpty);
  const priced = stocked.filter((s) => s.valueLeftCents !== null);

  const grams12 = monthlyUsage(events, 12, now);
  const cost12 = monthlyUsage(events, 12, now, cost);
  // Average over the months actually tracked (at most 12), so a history that
  // started last month isn't divided by twelve.
  const trackedMonths = trackedSince
    ? Math.min(
        12,
        Math.max(
          1,
          (now.getUTCFullYear() - trackedSince.getUTCFullYear()) * 12 +
            now.getUTCMonth() -
            trackedSince.getUTCMonth() +
            1
        )
      )
    : 1;

  const common = { events, inventory, now, trackedSince };
  return {
    trackedSince: trackedSince?.toISOString() ?? null,
    delta: usageDelta(events, now),
    costLast30Cents: recent.reduce((sum, e) => sum + cost(e), 0),
    avgPerMonthGrams:
      grams12.slice(-trackedMonths).reduce((s, m) => s + m.value, 0) /
      trackedMonths,
    stockValueCents: priced.reduce((s, x) => s + x.valueLeftCents!, 0),
    pricedSpools: priced.length,
    stockedSpools: stocked.length,
    monthly: grams12.map((m, i) => ({
      month: m.month,
      grams: m.value,
      costCents: cost12[i].value,
    })),
    byType: usageRows({
      ...common,
      eventKey: (e) => meta.get(e.spoolId)!.filamentType,
      keyOf: (m) => m.material.filamentType,
      labelOf: (m) => m.material.filamentType,
    }),
    byMaterial: usageRows({
      ...common,
      eventKey: (e) => meta.get(e.spoolId)!.materialId,
      keyOf: (m) => m.material.id,
      labelOf: (m) => `${m.material.manufacturer} ${m.material.name}`,
      colorOf: (m) => m.material.color,
      typeOf: (m) => m.material.filamentType,
    }),
    stockByType: stockByType(inventory),
  };
}
