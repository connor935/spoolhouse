import "server-only"

import { db } from "@/lib/db"
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
} from "@/lib/db/schema"
import { toSpoolView, type SpoolView } from "@/lib/filament"
import { and, eq, inArray } from "drizzle-orm"

export type SharedSpool = SpoolView & {
  material: Material
  ownerId: string
  ownerName: string
  lentTo: { lendId: number; borrowerId: string; borrowerName: string } | null
  // Outstanding (not yet approved/declined) borrow request, if any
  pendingRequest: { lendId: number; borrowerId: string; borrowerName: string } | null
}

export async function getMembership(groupId: number, userId: string): Promise<GroupMember | undefined> {
  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
  return membership
}

// Resolves every member's share mode + MATERIAL-level overrides into the
// group's pooled stock. Single source of truth — reused by lend actions
// and (later) search.
export async function getSharedFilaments(groupId: number): Promise<SharedSpool[]> {
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
    .select({ spool: spools, material: materials, spoolType: spoolTypes })
    .from(spools)
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .innerJoin(spoolTypes, eq(spools.spoolTypeId, spoolTypes.id))
    .where(
      inArray(
        spools.userId,
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

  // Per member: set of overridden MATERIAL ids
  const overridesByMember = new Map<number, Set<number>>()
  for (const o of overrides) {
    const set = overridesByMember.get(o.groupMemberId) ?? new Set<number>()
    set.add(o.materialId)
    overridesByMember.set(o.groupMemberId, set)
  }

  const openLends = await db
    .select({ lend: lends, borrowerName: user.name })
    .from(lends)
    .innerJoin(user, eq(lends.borrowerId, user.id))
    .where(and(eq(lends.groupId, groupId), inArray(lends.status, ["active", "requested"])))
  const activeLendBySpoolId = new Map(
    openLends.filter((l) => l.lend.status === "active").map((l) => [l.lend.filamentId, l]),
  )
  const requestedLendBySpoolId = new Map(
    openLends.filter((l) => l.lend.status === "requested").map((l) => [l.lend.filamentId, l]),
  )

  const result: SharedSpool[] = []
  for (const row of rows) {
    const member = memberByUserId.get(row.spool.userId)
    if (!member) continue

    const overrideSet = overridesByMember.get(member.groupMemberId) ?? new Set<number>()
    const shared =
      member.shareMode === "whitelist"
        ? overrideSet.has(row.material.id)
        : member.shareMode === "blacklist"
          ? !overrideSet.has(row.material.id)
          : true // 'all'
    if (!shared) continue

    const view = toSpoolView(row.spool, row.spoolType)
    if (view.isEmpty) continue // empty spools excluded from group stock

    const activeLend = activeLendBySpoolId.get(row.spool.id)
    const requestedLend = requestedLendBySpoolId.get(row.spool.id)

    result.push({
      ...view,
      material: row.material,
      ownerId: row.spool.userId,
      ownerName: member.userName,
      lentTo: activeLend
        ? {
            lendId: activeLend.lend.id,
            borrowerId: activeLend.lend.borrowerId,
            borrowerName: activeLend.borrowerName,
          }
        : null,
      pendingRequest: requestedLend
        ? {
            lendId: requestedLend.lend.id,
            borrowerId: requestedLend.lend.borrowerId,
            borrowerName: requestedLend.borrowerName,
          }
        : null,
    })
  }

  return result
}
