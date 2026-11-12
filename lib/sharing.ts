import 'server-only';

import { db } from '@/lib/db';
import {
  filamentShareOverrides,
  groupMembers,
  lends,
  materials,
  spools,
  spoolTypes,
  user,
  type GroupMember,
  type Material,
} from '@/lib/db/schema';
import {
  toSpoolView,
  withoutOwnerDetails,
  type SpoolView,
} from '@/lib/filament';
import { isMaterialShared } from '@/lib/share-mode';
import { and, eq, inArray } from 'drizzle-orm';
import { cache } from 'react';

export type SharedSpool = SpoolView & {
  material: Material;
  ownerId: string;
  ownerName: string;
  lentTo: {
    lendId: string;
    borrowerId: string;
    borrowerName: string;
    // When the owner approved the lend
    since: Date | null;
  } | null;
  // Outstanding (not yet approved/declined) borrow request, if any
  pendingRequest: {
    lendId: string;
    borrowerId: string;
    borrowerName: string;
  } | null;
};

export async function getMembership(
  groupId: string,
  userId: string
): Promise<GroupMember | undefined> {
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId))
    );
  return membership;
}

// Resolves every member's share mode + MATERIAL-level overrides into the
// group's pooled stock. Single source of truth — reused by lend actions
// and (later) search. Spools not owned by `viewerId` come without the owner's
// private details (withoutOwnerDetails), so no caller can pass them on.
export async function getSharedFilaments(
  groupId: string,
  viewerId: string
): Promise<SharedSpool[]> {
  const byGroup = await getSharedFilamentsForGroups([groupId], viewerId);
  return byGroup.get(groupId) ?? [];
}

// The pooled stock of the viewer's own groups, resolved once per request:
// the shell's nav counts, the /groups cards, the group page and the material
// page's "In your groups" all read it, so a page render runs the four stock
// queries once instead of once per group per caller. The result is shared —
// callers must not mutate it. Server actions that act on stock (requestLend)
// call getSharedFilaments() instead, to check against fresh data.
export const getStockForMyGroups = cache(
  async (viewerId: string): Promise<Map<string, SharedSpool[]>> => {
    const mine = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, viewerId));
    return getSharedFilamentsForGroups(
      mine.map((m) => m.groupId),
      viewerId
    );
  }
);

// getSharedFilaments() for several groups in four queries total: members,
// their spools, share overrides and open lends, each across all the groups.
// A spool shared in two groups appears in both lists (lends are per group).
export async function getSharedFilamentsForGroups(
  groupIds: string[],
  viewerId: string
): Promise<Map<string, SharedSpool[]>> {
  const result = new Map<string, SharedSpool[]>(groupIds.map((id) => [id, []]));
  if (groupIds.length === 0) return result;

  const members = await db
    .select({
      groupId: groupMembers.groupId,
      groupMemberId: groupMembers.id,
      userId: groupMembers.userId,
      shareMode: groupMembers.shareMode,
      userName: user.name,
    })
    .from(groupMembers)
    .innerJoin(user, eq(groupMembers.userId, user.id))
    .where(inArray(groupMembers.groupId, groupIds));
  if (members.length === 0) return result;

  const [rows, overrides, openLends] = await Promise.all([
    db
      .select({ spool: spools, material: materials, spoolType: spoolTypes })
      .from(spools)
      .innerJoin(materials, eq(spools.materialId, materials.id))
      .innerJoin(spoolTypes, eq(spools.spoolTypeId, spoolTypes.id))
      .where(
        inArray(spools.userId, [...new Set(members.map((m) => m.userId))])
      ),
    db
      .select()
      .from(filamentShareOverrides)
      .where(
        inArray(
          filamentShareOverrides.groupMemberId,
          members.map((m) => m.groupMemberId)
        )
      ),
    db
      .select({ lend: lends, borrowerName: user.name })
      .from(lends)
      .innerJoin(user, eq(lends.borrowerId, user.id))
      .where(
        and(
          inArray(lends.groupId, groupIds),
          inArray(lends.status, ['active', 'requested'])
        )
      ),
  ]);

  // Per member: set of overridden MATERIAL ids
  const overridesByMember = new Map<string, Set<string>>();
  for (const o of overrides) {
    const set = overridesByMember.get(o.groupMemberId) ?? new Set<string>();
    set.add(o.materialId);
    overridesByMember.set(o.groupMemberId, set);
  }

  // Open lends keyed by group + spool: the same spool can be lent in one
  // group and free in another.
  const lendKey = (groupId: string, spoolId: string) => `${groupId}:${spoolId}`;
  const activeLends = new Map<string, (typeof openLends)[number]>();
  const requestedLends = new Map<string, (typeof openLends)[number]>();
  for (const l of openLends)
    (l.lend.status === 'active' ? activeLends : requestedLends).set(
      lendKey(l.lend.groupId, l.lend.filamentId),
      l
    );

  // The spool view depends only on the spool, so build it once even when the
  // owner is in several of the groups.
  const views = new Map<string, SpoolView>();
  const viewOf = (row: (typeof rows)[number]) => {
    let view = views.get(row.spool.id);
    if (!view) {
      const full = toSpoolView(
        row.spool,
        row.spoolType,
        row.material.filamentType
      );
      view = row.spool.userId === viewerId ? full : withoutOwnerDetails(full);
      views.set(row.spool.id, view);
    }
    return view;
  };

  const spoolsByUserId = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = spoolsByUserId.get(row.spool.userId) ?? [];
    list.push(row);
    spoolsByUserId.set(row.spool.userId, list);
  }

  for (const member of members) {
    const stock = result.get(member.groupId)!;
    const overrideSet =
      overridesByMember.get(member.groupMemberId) ?? new Set<string>();
    for (const row of spoolsByUserId.get(member.userId) ?? []) {
      if (!isMaterialShared(member.shareMode, overrideSet, row.material.id))
        continue;
      const view = viewOf(row);
      if (view.isEmpty) continue; // empty spools excluded from group stock

      const key = lendKey(member.groupId, row.spool.id);
      const activeLend = activeLends.get(key);
      const requestedLend = requestedLends.get(key);
      stock.push({
        ...view,
        material: row.material,
        ownerId: row.spool.userId,
        ownerName: member.userName,
        lentTo: activeLend
          ? {
              lendId: activeLend.lend.id,
              borrowerId: activeLend.lend.borrowerId,
              borrowerName: activeLend.borrowerName,
              since: activeLend.lend.respondedAt,
            }
          : null,
        pendingRequest: requestedLend
          ? {
              lendId: requestedLend.lend.id,
              borrowerId: requestedLend.lend.borrowerId,
              borrowerName: requestedLend.borrowerName,
            }
          : null,
      });
    }
  }

  return result;
}
