import 'server-only';

import { and, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/lib/db';
import {
  lends,
  materials,
  spools,
  spoolTypes,
  spoolWeighings,
  user,
} from '@/lib/db/schema';
import {
  shapeActivity,
  type ActivityEvent,
  type LendActivityRow,
  type WeighingActivityRow,
} from '@/lib/activity';

const actor = alias(user, 'actor_user');
const ownerUser = alias(user, 'owner_user');
const borrowerUser = alias(user, 'borrower_user');

// The viewer's newest weighings: on their own spools (by anyone, a borrower
// included) and the ones they made on borrowed spools. The previous weight is
// taken over the spool's whole history, so it is computed before filtering
// by actor and before the limit.
async function recentWeighings(
  userId: string,
  limit: number
): Promise<WeighingActivityRow[]> {
  const weighedByUser = db
    .select({ spoolId: spoolWeighings.spoolId })
    .from(spoolWeighings)
    .where(eq(spoolWeighings.userId, userId));
  const ranked = db
    .select({
      id: spoolWeighings.id,
      spoolId: spoolWeighings.spoolId,
      grams: spoolWeighings.grams,
      measuredAt: spoolWeighings.measuredAt,
      actorId: spoolWeighings.userId,
      previousGrams: sql<number | null>`lag(${spoolWeighings.grams}) over (
        partition by ${spoolWeighings.spoolId}
        order by ${spoolWeighings.measuredAt}, ${spoolWeighings.id}
      )`.as('previous_grams'),
    })
    .from(spoolWeighings)
    .innerJoin(spools, eq(spoolWeighings.spoolId, spools.id))
    .where(or(eq(spools.userId, userId), inArray(spools.id, weighedByUser)))
    .as('ranked');

  return db
    .select({
      id: ranked.id,
      spoolId: ranked.spoolId,
      grams: ranked.grams,
      previousGrams: ranked.previousGrams,
      measuredAt: ranked.measuredAt,
      actorId: ranked.actorId,
      actorName: actor.name,
      emptyWeightGrams: spoolTypes.emptyWeightGrams,
      materialName: materials.name,
      ownerId: spools.userId,
    })
    .from(ranked)
    .innerJoin(spools, eq(ranked.spoolId, spools.id))
    .innerJoin(spoolTypes, eq(spools.spoolTypeId, spoolTypes.id))
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .leftJoin(actor, eq(ranked.actorId, actor.id))
    .where(
      and(
        // Baseline rows (migration 0010) have no actor and are no event.
        isNotNull(ranked.actorId),
        or(eq(spools.userId, userId), eq(ranked.actorId, userId))
      )
    )
    .orderBy(desc(ranked.measuredAt), desc(ranked.id))
    .limit(limit);
}

// Lends on the viewer's spools or borrowed by them, by their latest event.
async function recentLends(
  userId: string,
  limit: number
): Promise<LendActivityRow[]> {
  return db
    .select({
      id: lends.id,
      spoolId: lends.filamentId,
      status: lends.status,
      requestedAt: lends.requestedAt,
      respondedAt: lends.respondedAt,
      returnedAt: lends.returnedAt,
      ownerId: spools.userId,
      ownerName: ownerUser.name,
      borrowerId: lends.borrowerId,
      borrowerName: borrowerUser.name,
      materialName: materials.name,
    })
    .from(lends)
    .innerJoin(spools, eq(lends.filamentId, spools.id))
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .innerJoin(ownerUser, eq(spools.userId, ownerUser.id))
    .innerJoin(borrowerUser, eq(lends.borrowerId, borrowerUser.id))
    .where(or(eq(spools.userId, userId), eq(lends.borrowerId, userId)))
    .orderBy(
      // greatest() skips NULLs: the lend's latest event, whichever it was.
      desc(
        sql`greatest(${lends.requestedAt}, ${lends.respondedAt}, ${lends.returnedAt})`
      )
    )
    .limit(limit);
}

// Overview "Recent activity": both sources read `limit` rows each, so the
// merged feed is complete up to `limit` entries.
export async function getRecentActivity(
  userId: string,
  limit = 10
): Promise<ActivityEvent[]> {
  const [weighings, lendRows] = await Promise.all([
    recentWeighings(userId, limit),
    recentLends(userId, limit),
  ]);
  return shapeActivity(weighings, lendRows, userId, limit);
}
