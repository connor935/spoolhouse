'use server';

import { db } from '@/lib/db';
import {
  groups,
  lends,
  materials,
  spools,
  spoolTypes,
  user,
} from '@/lib/db/schema';
import { requireUser } from '@/lib/auth-session';
import { isUniqueViolation } from '@/lib/db/errors';
import { emitSpoolChange } from '@/lib/events';
import { toSpoolView, withoutOwnerDetails } from '@/lib/filament';
import { createNotification, type NotificationType } from '@/lib/notifications';
import { getMembership, getSharedFilaments } from '@/lib/sharing';
import { getSpoolNumbers } from '@/lib/spool-numbers';
import { and, desc, eq, inArray, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { revalidatePath } from 'next/cache';

export async function requestLend(spoolId: string, groupId: string) {
  const authUser = await requireUser();
  const membership = await getMembership(groupId, authUser.id);
  if (!membership) throw new Error('Not a member of this group');

  const [row] = await db
    .select({ spool: spools, materialName: materials.name })
    .from(spools)
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .where(eq(spools.id, spoolId));
  if (!row) throw new Error('Spool not found');
  if (row.spool.userId === authUser.id)
    throw new Error("You can't borrow your own spool");

  const shared = await getSharedFilaments(groupId, authUser.id);
  if (!shared.some((f) => f.id === spoolId))
    throw new Error("This spool isn't shared in this group");

  const [existing] = await db
    .select({ id: lends.id })
    .from(lends)
    .where(
      and(
        eq(lends.filamentId, spoolId),
        inArray(lends.status, ['requested', 'active'])
      )
    );
  const alreadyLent = 'This spool already has a pending or active lend';
  if (existing) throw new Error(alreadyLent);

  // The check above gives the friendly message in the common case; the
  // partial unique index lends_one_open_per_filament settles concurrent
  // requests that both passed it.
  let created: typeof lends.$inferSelect;
  try {
    [created] = await db
      .insert(lends)
      .values({
        filamentId: spoolId,
        groupId,
        borrowerId: authUser.id,
        status: 'requested',
      })
      .returning();
  } catch (error) {
    if (isUniqueViolation(error, 'lends_one_open_per_filament'))
      throw new Error(alreadyLent);
    throw error;
  }

  const [group] = await db
    .select({ name: groups.name })
    .from(groups)
    .where(eq(groups.id, groupId));
  await createNotification({
    userId: row.spool.userId,
    type: 'lend_requested',
    actorName: authUser.name,
    filamentName: row.materialName,
    groupName: group?.name ?? 'a group',
    lendId: created.id,
  });

  revalidatePath(`/groups/${groupId}`);
  revalidatePath('/');
  await emitSpoolChange(row.spool.userId);
}

// The lend joined with the data every action below needs: authz (ownerId /
// lend.borrowerId) + notification copy (materialName, groupName).
async function loadLendContext(lendId: string) {
  const [row] = await db
    .select({
      lend: lends,
      ownerId: spools.userId,
      spoolWeightGrams: spools.measuredTotalWeightGrams,
      materialName: materials.name,
      groupName: groups.name,
    })
    .from(lends)
    .innerJoin(spools, eq(lends.filamentId, spools.id))
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .innerJoin(groups, eq(lends.groupId, groups.id))
    .where(eq(lends.id, lendId));
  return row;
}

async function requireSpoolOwner(lendId: string, userId: string) {
  const row = await loadLendContext(lendId);
  if (!row || row.ownerId !== userId) throw new Error('Not authorized');
  return row;
}

// Folds the revalidate + live-update triad every mutation below ends with.
async function revalidateLend(
  groupId: string,
  userId: string,
  includeRoot = true
) {
  revalidatePath(`/groups/${groupId}`);
  if (includeRoot) revalidatePath('/');
  await emitSpoolChange(userId);
}

// Shared tail for the three owner-driven status transitions: authz →
// status guard → update → notify borrower → revalidate.
async function transitionLend(
  lendId: string,
  config: {
    from: string;
    to: string;
    stampField: 'respondedAt' | 'returnedAt';
    // Snapshot of the spool's weight at this transition; start − end is what
    // the borrower used (shown in the Borrows tab).
    weightField?: 'startWeightGrams' | 'endWeightGrams';
    notifyType: NotificationType;
    invalidStatusMessage: string;
    includeRoot?: boolean;
  }
) {
  const authUser = await requireUser();
  const { lend, materialName, groupName, spoolWeightGrams } =
    await requireSpoolOwner(lendId, authUser.id);
  if (lend.status !== config.from) throw new Error(config.invalidStatusMessage);
  // Re-check the status in the WHERE: a concurrent approve/decline that ran
  // between the read above and this write must make this one a no-op.
  const updated = await db
    .update(lends)
    .set({
      status: config.to,
      [config.stampField]: new Date(),
      ...(config.weightField && { [config.weightField]: spoolWeightGrams }),
      updatedAt: new Date(),
    })
    .where(and(eq(lends.id, lendId), eq(lends.status, config.from)))
    .returning({ id: lends.id });
  if (updated.length === 0) throw new Error(config.invalidStatusMessage);
  await createNotification({
    userId: lend.borrowerId,
    type: config.notifyType,
    actorName: authUser.name,
    filamentName: materialName,
    groupName,
    lendId,
  });
  await revalidateLend(lend.groupId, authUser.id, config.includeRoot);
}

export async function approveLend(lendId: string) {
  await transitionLend(lendId, {
    from: 'requested',
    to: 'active',
    stampField: 'respondedAt',
    weightField: 'startWeightGrams',
    notifyType: 'lend_approved',
    invalidStatusMessage: 'Lend request already handled',
  });
}

export async function declineLend(lendId: string) {
  await transitionLend(lendId, {
    from: 'requested',
    to: 'declined',
    stampField: 'respondedAt',
    notifyType: 'lend_declined',
    invalidStatusMessage: 'Lend request already handled',
    includeRoot: false,
  });
}

export async function markReturned(lendId: string) {
  await transitionLend(lendId, {
    from: 'active',
    to: 'returned',
    stampField: 'returnedAt',
    weightField: 'endWeightGrams',
    notifyType: 'lend_returned',
    invalidStatusMessage: 'Lend is not active',
  });
}

// Borrower withdraws their own pending request. The row is deleted —
// cancelled requests carry no history value (unlike declined ones).
export async function cancelLendRequest(lendId: string) {
  const authUser = await requireUser();
  const row = await loadLendContext(lendId);
  if (!row || row.lend.borrowerId !== authUser.id)
    throw new Error('Not authorized');
  if (row.lend.status !== 'requested')
    throw new Error('Only pending requests can be cancelled');

  // Status in the WHERE: an approval racing this cancel must win cleanly
  // instead of having its now-active lend deleted.
  const deleted = await db
    .delete(lends)
    .where(and(eq(lends.id, lendId), eq(lends.status, 'requested')))
    .returning({ id: lends.id });
  if (deleted.length === 0)
    throw new Error('Only pending requests can be cancelled');
  await createNotification({
    userId: row.ownerId,
    type: 'lend_request_cancelled',
    actorName: authUser.name,
    filamentName: row.materialName,
    groupName: row.groupName,
  });
  await revalidateLend(row.lend.groupId, row.ownerId);
}

const borrowerUser = alias(user, 'borrower_user');
const ownerUser = alias(user, 'owner_user');

// Active lends on the current user's own spools, for the "Lent to X" badge
// on the own dashboard.
export async function getActiveLendsForOwner() {
  const authUser = await requireUser();
  return db
    .select({ spoolId: lends.filamentId, borrowerName: borrowerUser.name })
    .from(lends)
    .innerJoin(spools, eq(lends.filamentId, spools.id))
    .innerJoin(borrowerUser, eq(lends.borrowerId, borrowerUser.id))
    .where(and(eq(spools.userId, authUser.id), eq(lends.status, 'active')));
}

// Every lend the current user is involved in (as owner or borrower),
// across all groups, newest first — feeds /borrows and the dashboard tab.
// `spoolView` is what the borrower's re-weigh form needs; the raw spool row
// (tag uid etc.) is not passed on.
export async function getMyLends() {
  const authUser = await requireUser();
  const rows = await db
    .select({
      lend: lends,
      spool: spools,
      spoolType: spoolTypes,
      materialFilamentType: materials.filamentType,
      materialColor: materials.color,
      materialName: materials.name,
      materialManufacturer: materials.manufacturer,
      measuredTotalWeightGrams: spools.measuredTotalWeightGrams,
      emptyWeightGrams: spoolTypes.emptyWeightGrams,
      fullFilamentWeightGrams: spools.fullFilamentWeightGrams,
      pricePaidCents: spools.pricePaidCents,
      ownerId: spools.userId,
      ownerName: ownerUser.name,
      borrowerName: borrowerUser.name,
      groupName: groups.name,
    })
    .from(lends)
    .innerJoin(spools, eq(lends.filamentId, spools.id))
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .innerJoin(spoolTypes, eq(spools.spoolTypeId, spoolTypes.id))
    .innerJoin(borrowerUser, eq(lends.borrowerId, borrowerUser.id))
    .innerJoin(ownerUser, eq(spools.userId, ownerUser.id))
    .innerJoin(groups, eq(lends.groupId, groups.id))
    .where(
      or(eq(spools.userId, authUser.id), eq(lends.borrowerId, authUser.id))
    )
    .orderBy(desc(lends.requestedAt));
  const numbers = await getSpoolNumbers(rows.map((r) => r.lend.filamentId));
  return rows.map(({ spool, spoolType, materialFilamentType, ...row }) => {
    const view = toSpoolView(spool, spoolType, materialFilamentType);
    return {
      ...row,
      spoolNumber: numbers.get(spool.id) ?? null,
      // A borrower (or a past/declined requester) sees the weights only.
      spoolView: row.ownerId === authUser.id ? view : withoutOwnerDetails(view),
    };
  });
}

export type MyLend = Awaited<ReturnType<typeof getMyLends>>[number];
