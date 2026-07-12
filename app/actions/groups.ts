'use server';

import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import {
  filamentShareOverrides,
  groupMembers,
  groups,
  spools,
  user,
} from '@/lib/db/schema';
import { requireUser } from '@/lib/auth-session';
import { getMembership } from '@/lib/sharing';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

function generateInviteCode() {
  return randomBytes(6).toString('base64url');
}

async function requireOwner(groupId: number, userId: string) {
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
  await db
    .insert(groupMembers)
    .values({
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
    await db
      .insert(groupMembers)
      .values({
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

export async function leaveGroup(groupId: number) {
  const authUser = await requireUser();
  await db
    .delete(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, authUser.id),
        ne(groupMembers.role, 'owner')
      )
    );
  revalidatePath('/groups');
}

export async function removeMember(groupId: number, memberUserId: string) {
  const authUser = await requireUser();
  await requireOwner(groupId, authUser.id);
  await db
    .delete(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, memberUserId),
        ne(groupMembers.role, 'owner')
      )
    );
  revalidatePath(`/groups/${groupId}`);
}

export async function rotateInviteCode(groupId: number) {
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

export async function renameGroup(groupId: number, name: string) {
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

export async function deleteGroup(groupId: number) {
  const authUser = await requireUser();
  await requireOwner(groupId, authUser.id);
  await db.delete(groups).where(eq(groups.id, groupId));
  revalidatePath('/groups');
}

export async function updateShareSettings(
  groupId: number,
  mode: 'all' | 'whitelist' | 'blacklist',
  overrideMaterialIds: number[]
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
    await db
      .insert(filamentShareOverrides)
      .values(
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

export async function getGroupDetail(groupId: number) {
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

  return {
    group,
    members,
    myMembership: membership,
    myOverrideMaterialIds: myOverrides.map((o) => o.materialId),
  };
}

export async function getGroupByInviteCode(code: string) {
  await requireUser();
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, code));
  return group ?? null;
}
