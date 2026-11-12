'use server';

import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import {
  filamentShareOverrides,
  groupMembers,
  groups,
  lends,
  materials,
  spools,
  user,
} from '@/lib/db/schema';
import { requireUser } from '@/lib/auth-session';
import { emitSpoolChange } from '@/lib/events';
import { createNotification } from '@/lib/notifications';
import {
  getMembership,
  getSharedFilaments,
  getStockForMyGroups,
} from '@/lib/sharing';
import { and, asc, eq, inArray, ne, or, type SQL } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

function generateInviteCode() {
  return randomBytes(6).toString('base64url');
}

async function requireOwner(groupId: string, userId: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.ownerId, userId)));
  if (!group) throw new Error('Not authorized');
  return group;
}

export async function createGroup(name: string) {
  const authUser = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Group name is required');
  const [group] = await db
    .insert(groups)
    .values({
      name: trimmed,
      ownerId: authUser.id,
      inviteCode: generateInviteCode(),
    })
    .returning();
  await db.insert(groupMembers).values({
    groupId: group.id,
    userId: authUser.id,
    role: 'owner',
    shareMode: 'all',
  });
  revalidatePath('/groups');
  return group;
}

export async function joinGroup(code: string) {
  const authUser = await requireUser();
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, code.trim()));
  if (!group) throw new Error('Invalid invite code');
  const existing = await getMembership(group.id, authUser.id);
  if (!existing) {
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: authUser.id,
      role: 'member',
      shareMode: 'all',
    });
  }
  revalidatePath('/groups');
  revalidatePath(`/groups/${group.id}`);
  return group;
}

// Open lends must not dangle when a group or a membership goes away: the lend
// rows cascade with the group, and a departed member's requests/loans would
// otherwise stay open with nobody able to act on them in that group.
// - Active lends block: the spool is physically elsewhere, so the owner has
//   to mark it returned first (the history then survives a membership change).
// - Pending requests are closed: withdrawn when a member leaves on their own
//   (owner notified), declined otherwise (borrower notified).
// `scope` narrows the group's lends to the ones that concern a departing
// member; omitted, it means the whole group (deleteGroup).
async function settleOpenLends(
  groupId: string,
  actor: { id: string; name: string },
  departingUserId?: string
) {
  const scope: SQL | undefined = departingUserId
    ? or(
        eq(lends.borrowerId, departingUserId),
        eq(spools.userId, departingUserId)
      )
    : undefined;
  const open = await db
    .select({
      id: lends.id,
      status: lends.status,
      borrowerId: lends.borrowerId,
      ownerId: spools.userId,
      materialName: materials.name,
      groupName: groups.name,
    })
    .from(lends)
    .innerJoin(spools, eq(lends.filamentId, spools.id))
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .innerJoin(groups, eq(lends.groupId, groups.id))
    .where(
      and(
        eq(lends.groupId, groupId),
        inArray(lends.status, ['requested', 'active']),
        scope
      )
    );

  const active = open.filter((l) => l.status === 'active').length;
  if (active > 0)
    throw new Error(
      `${active} active lend${active === 1 ? '' : 's'} in this group — mark ${active === 1 ? 'it' : 'them'} returned first`
    );

  const touched = new Set<string>();
  for (const l of open) {
    // A member leaving withdraws their own requests (like cancelLendRequest);
    // everything else — removal by the owner, group deletion, requests on the
    // departing member's spools — is a decline the borrower hears about.
    const withdrawn =
      l.borrowerId === departingUserId && departingUserId === actor.id;
    const recipient = withdrawn ? l.ownerId : l.borrowerId;
    // Status in the WHERE, as in app/actions/lends.ts: an approval that raced
    // us wins and turns into an active lend instead of being closed here.
    const changed = withdrawn
      ? await db
          .delete(lends)
          .where(and(eq(lends.id, l.id), eq(lends.status, 'requested')))
          .returning({ id: lends.id })
      : await db
          .update(lends)
          .set({
            status: 'declined',
            respondedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(lends.id, l.id), eq(lends.status, 'requested')))
          .returning({ id: lends.id });
    if (changed.length === 0)
      throw new Error('A lend in this group just changed — try again');
    if (recipient !== actor.id)
      await createNotification({
        userId: recipient,
        type: withdrawn ? 'lend_request_cancelled' : 'lend_declined',
        actorName: actor.name,
        filamentName: l.materialName,
        groupName: l.groupName,
        lendId: withdrawn ? undefined : l.id,
      });
    touched.add(l.ownerId).add(l.borrowerId);
  }
  for (const userId of touched) await emitSpoolChange(userId);
  if (touched.size > 0) revalidatePath('/');
}

// Shared by leaveGroup/removeMember — never removes the owner's own row.
async function removeMembership(
  groupId: string,
  userId: string,
  actor: { id: string; name: string }
) {
  const membership = await getMembership(groupId, userId);
  if (!membership || membership.role === 'owner') return;
  await settleOpenLends(groupId, actor, userId);
  await db
    .delete(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
        ne(groupMembers.role, 'owner')
      )
    );
}

export async function leaveGroup(groupId: string) {
  const authUser = await requireUser();
  await removeMembership(groupId, authUser.id, authUser);
  revalidatePath('/groups');
}

export async function removeMember(groupId: string, memberUserId: string) {
  const authUser = await requireUser();
  await requireOwner(groupId, authUser.id);
  await removeMembership(groupId, memberUserId, authUser);
  revalidatePath(`/groups/${groupId}`);
}

export async function rotateInviteCode(groupId: string) {
  const authUser = await requireUser();
  await requireOwner(groupId, authUser.id);
  const inviteCode = generateInviteCode();
  await db
    .update(groups)
    .set({ inviteCode, updatedAt: new Date() })
    .where(eq(groups.id, groupId));
  revalidatePath(`/groups/${groupId}`);
  return inviteCode;
}

export async function renameGroup(groupId: string, name: string) {
  const authUser = await requireUser();
  await requireOwner(groupId, authUser.id);
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Group name is required');
  await db
    .update(groups)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(groups.id, groupId));
  revalidatePath(`/groups/${groupId}`);
  revalidatePath('/groups');
}

export async function deleteGroup(groupId: string) {
  const authUser = await requireUser();
  await requireOwner(groupId, authUser.id);
  await settleOpenLends(groupId, authUser);
  await db.delete(groups).where(eq(groups.id, groupId));
  revalidatePath('/groups');
}

export async function updateShareSettings(
  groupId: string,
  mode: 'all' | 'whitelist' | 'blacklist',
  overrideMaterialIds: string[]
) {
  const authUser = await requireUser();
  const membership = await getMembership(groupId, authUser.id);
  if (!membership) throw new Error('Not a member of this group');

  // Overrides are material-level; only materials the member actually has
  // spools of can go on their list.
  const ownMaterials =
    overrideMaterialIds.length > 0
      ? await db
          .selectDistinct({ materialId: spools.materialId })
          .from(spools)
          .where(
            and(
              eq(spools.userId, authUser.id),
              inArray(spools.materialId, overrideMaterialIds)
            )
          )
      : [];
  const validIds = ownMaterials.map((m) => m.materialId);

  await db
    .update(groupMembers)
    .set({ shareMode: mode })
    .where(eq(groupMembers.id, membership.id));
  await db
    .delete(filamentShareOverrides)
    .where(eq(filamentShareOverrides.groupMemberId, membership.id));
  if (validIds.length > 0) {
    await db.insert(filamentShareOverrides).values(
      validIds.map((materialId) => ({
        groupMemberId: membership.id,
        materialId,
      }))
    );
  }
  revalidatePath(`/groups/${groupId}`);
  revalidatePath('/');
}

// --- Queries for pages ---

export async function getMyGroups() {
  const authUser = await requireUser();
  return db
    .select({ group: groups, membership: groupMembers })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, authUser.id));
}

export async function getGroupDetail(groupId: string) {
  const authUser = await requireUser();
  const membership = await getMembership(groupId, authUser.id);
  if (!membership) return null;

  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) return null;

  const members = await db
    .select({ member: groupMembers, name: user.name, email: user.email })
    .from(groupMembers)
    .innerJoin(user, eq(groupMembers.userId, user.id))
    .where(eq(groupMembers.groupId, groupId));

  const myOverrides = await db
    .select({ materialId: filamentShareOverrides.materialId })
    .from(filamentShareOverrides)
    .where(eq(filamentShareOverrides.groupMemberId, membership.id));

  // Active lends per member, either side — the same scope settleOpenLends()
  // refuses a removal or leave for, so the UI can say so up front.
  const active = await db
    .select({ borrowerId: lends.borrowerId, ownerId: spools.userId })
    .from(lends)
    .innerJoin(spools, eq(lends.filamentId, spools.id))
    .where(and(eq(lends.groupId, groupId), eq(lends.status, 'active')));
  const activeLendsByUserId: Record<string, number> = {};
  for (const l of active)
    for (const id of new Set([l.borrowerId, l.ownerId]))
      activeLendsByUserId[id] = (activeLendsByUserId[id] ?? 0) + 1;

  return {
    group,
    members,
    myMembership: membership,
    myOverrideMaterialIds: myOverrides.map((o) => o.materialId),
    activeLendCount: active.length,
    activeLendsByUserId,
  };
}

// The /groups cards: members, pooled stock size and how much of it is yours.
export async function getMyGroupSummaries() {
  const authUser = await requireUser();
  const memberships = await getMyGroups();
  if (memberships.length === 0) return [];
  const memberRows = await db
    .select({ groupId: groupMembers.groupId, id: user.id, name: user.name })
    .from(groupMembers)
    .innerJoin(user, eq(groupMembers.userId, user.id))
    .where(
      inArray(
        groupMembers.groupId,
        memberships.map((m) => m.group.id)
      )
    )
    .orderBy(asc(groupMembers.joinedAt));
  const stockByGroup = await getStockForMyGroups(authUser.id);
  const summaries = memberships.map(({ group, membership }) => {
    const stock = stockByGroup.get(group.id) ?? [];
    return {
      id: group.id,
      name: group.name,
      role: membership.role as 'owner' | 'member',
      members: memberRows
        .filter((m) => m.groupId === group.id)
        .map(({ id, name }) => ({ id, name })),
      sharedSpoolCount: stock.length,
      youShareCount: stock.filter((s) => s.ownerId === authUser.id).length,
    };
  });
  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}

export type GroupSummary = Awaited<
  ReturnType<typeof getMyGroupSummaries>
>[number];

async function getGroupByInviteCode(code: string) {
  await requireUser();
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, code));
  return group ?? null;
}

// What the join page shows before joining. Holding the invite code is what
// entitles you to see it — the same code joins the group.
export async function getGroupInvitePreview(code: string) {
  const authUser = await requireUser();
  const group = await getGroupByInviteCode(code.trim());
  if (!group) return null;
  const [members, stock] = await Promise.all([
    db
      .select({ userId: groupMembers.userId, name: user.name })
      .from(groupMembers)
      .innerJoin(user, eq(groupMembers.userId, user.id))
      .where(eq(groupMembers.groupId, group.id)),
    getSharedFilaments(group.id, authUser.id),
  ]);
  return {
    id: group.id,
    name: group.name,
    memberCount: members.length,
    sharedSpoolCount: stock.length,
    ownerName: members.find((m) => m.userId === group.ownerId)?.name ?? null,
    alreadyMember: members.some((m) => m.userId === authUser.id),
  };
}
