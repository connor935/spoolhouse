import 'server-only';

import { and, count, eq, gt, sql } from 'drizzle-orm';
import { cache } from 'react';
import { getMyGroups } from '@/app/actions/groups';
import { getUnreadCount } from '@/app/actions/notifications';
import { requireUser } from '@/lib/auth-session';
import { db } from '@/lib/db';
import { lends, materials, spools, spoolTypes } from '@/lib/db/schema';
import { EMPTY_THRESHOLD_G } from '@/lib/filament';
import type { NavCounts, NavGroup } from '@/lib/nav';
import { getStockForMyGroups } from '@/lib/sharing';

// Spools in stock = not empty: remaining filament (total − empty spool) above
// the empty threshold, the same rule as toSpoolView().isEmpty.
async function countInStock(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(spools)
    .innerJoin(spoolTypes, eq(spools.spoolTypeId, spoolTypes.id))
    .where(
      and(
        eq(spools.userId, userId),
        gt(
          sql`${spools.measuredTotalWeightGrams} - ${spoolTypes.emptyWeightGrams}`,
          EMPTY_THRESHOLD_G
        )
      )
    );
  return row?.value ?? 0;
}

// Borrow requests on the user's spools that wait for their approve/decline.
async function countIncomingRequests(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(lends)
    .innerJoin(spools, eq(lends.filamentId, spools.id))
    .where(and(eq(spools.userId, userId), eq(lends.status, 'requested')));
  return row?.value ?? 0;
}

// Group stock size per group, resolved by getSharedFilaments() — the single
// source of truth for share modes, which also leaves out empty spools. Read
// from the per-request getStockForMyGroups(), which the page shares.
async function groupsWithSharedCounts(userId: string): Promise<NavGroup[]> {
  const [memberships, stock] = await Promise.all([
    getMyGroups(),
    getStockForMyGroups(userId),
  ]);
  return memberships
    .map(({ group }) => ({
      id: group.id,
      name: group.name,
      sharedCount: stock.get(group.id)?.length ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function countPending(
  table: typeof materials | typeof spoolTypes
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(table)
    .where(eq(table.status, 'pending'));
  return row?.value ?? 0;
}

/**
 * Sidebar / bottom-nav badge counts for the signed-in user. Cached per
 * request, so the shell layout and a page can both ask for it.
 */
export const getNavCounts = cache(async (): Promise<NavCounts> => {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';
  const [
    inventory,
    borrowRequests,
    unreadNotifications,
    groups,
    pendingMaterials,
    pendingSpoolTypes,
  ] = await Promise.all([
    countInStock(user.id),
    countIncomingRequests(user.id),
    getUnreadCount(),
    groupsWithSharedCounts(user.id),
    isAdmin ? countPending(materials) : null,
    isAdmin ? countPending(spoolTypes) : null,
  ]);
  return {
    inventory,
    borrowRequests,
    unreadNotifications,
    groups,
    pendingMaterials,
    pendingSpoolTypes,
  };
});
