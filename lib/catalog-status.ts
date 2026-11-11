import { sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

export const CATALOG_STATUSES = ['approved', 'pending', 'rejected'] as const;
export type CatalogStatusValue = (typeof CATALOG_STATUSES)[number];
export type CatalogStatusCounts = Record<CatalogStatusValue, number>;

/** ORDER BY term that puts pending rows (the review backlog) first. */
export function pendingFirst(status: PgColumn): SQL {
  return sql`case when ${status} = 'pending' then 0 else 1 end`;
}

/** Folds `GROUP BY status` rows into a count per status; unknown statuses are ignored. */
export function countByStatus(
  rows: readonly { status: string; value: number }[]
): CatalogStatusCounts {
  const counts: CatalogStatusCounts = { approved: 0, pending: 0, rejected: 0 };
  for (const { status, value } of rows)
    if (status in counts) counts[status as CatalogStatusValue] += value;
  return counts;
}
