import "server-only"

import { db } from "@/lib/db"
import {
  filaments,
  filamentShareOverrides,
  groupMembers,
  lends,
  spoolTypes,
  user,
  type GroupMember,
} from "@/lib/db/schema"
import { toFilamentView, type FilamentView } from "@/lib/filament"
import { and, eq, inArray } from "drizzle-orm"

export type SharedFilament = FilamentView & {
  ownerId: string
  ownerName: string
  lentTo: { lendId: number; borrowerId: string; borrowerName: string } | null
}

export async function getMembership(groupId: number, userId: string): Promise<GroupMember | undefined> {
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
  return membership
}

// Resolves every member's share mode + overrides into the group's pooled
// stock. Single source of truth — reused by lend actions and (later) search.
export async function getSharedFilaments(groupId: number): Promise<SharedFilament[]> {
  const members = await db
    .select({
      groupMemberId: groupMembers.id,
      userId: groupMembers.userId,
      shareMode: groupMembers.shareMode,
      userName: user.name,
    })
    .from(groupMembers)
    .innerJoin(user, eq(groupMembers.userId, user.id))
    .where(eq(groupMembers.groupId, groupId))

  if (members.length === 0) return []

  const memberByUserId = new Map(members.map((m) => [m.userId, m]))

  const rows = await db
    .select()
    .from(filaments)
    .innerJoin(spoolTypes, eq(filaments.spoolTypeId, spoolTypes.id))
    .where(
      inArray(
        filaments.userId,
        members.map((m) => m.userId),
      ),
    )

  const overrides = await db
    .select()
    .from(filamentShareOverrides)
    .where(
      inArray(
        filamentShareOverrides.groupMemberId,
        members.map((m) => m.groupMemberId),
      ),
    )

  const overridesByMember = new Map<number, Set<number>>()
  for (const o of overrides) {
    const set = overridesByMember.get(o.groupMemberId) ?? new Set<number>()
    set.add(o.filamentId)
    overridesByMember.set(o.groupMemberId, set)
  }

  const activeLends = await db
    .select({ lend: lends, borrowerName: user.name })
    .from(lends)
    .innerJoin(user, eq(lends.borrowerId, user.id))
    .where(and(eq(lends.groupId, groupId), eq(lends.status, "active")))
  const activeLendByFilamentId = new Map(activeLends.map((l) => [l.lend.filamentId, l]))

  const result: SharedFilament[] = []
  for (const row of rows) {
    const f = row.filaments
    const st = row.spool_types
    const member = memberByUserId.get(f.userId)
    if (!member) continue

    const overrideSet = overridesByMember.get(member.groupMemberId) ?? new Set<number>()
    const shared =
      member.shareMode === "whitelist"
        ? overrideSet.has(f.id)
        : member.shareMode === "blacklist"
          ? !overrideSet.has(f.id)
          : true // 'all'
    if (!shared) continue

    const view = toFilamentView(f, st)
    if (view.isEmpty) continue // empty spools excluded from group stock

    const activeLend = activeLendByFilamentId.get(f.id)

    result.push({
      ...view,
      ownerId: f.userId,
      ownerName: member.userName,
      lentTo: activeLend
        ? {
            lendId: activeLend.lend.id,
            borrowerId: activeLend.lend.borrowerId,
            borrowerName: activeLend.borrowerName,
          }
        : null,
    })
  }

  return result
}
