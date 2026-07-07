"use server"

import { db } from "@/lib/db"
import { groups, lends, materials, spools, spoolTypes, user } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth-session"
import { createNotification } from "@/lib/notifications"
import { getMembership, getSharedFilaments } from "@/lib/sharing"
import { and, desc, eq, inArray, or } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import { revalidatePath } from "next/cache"

export async function requestLend(spoolId: number, groupId: number) {
  const authUser = await requireUser()
  const membership = await getMembership(groupId, authUser.id)
  if (!membership) throw new Error("Not a member of this group")

  const [row] = await db
    .select({ spool: spools, materialName: materials.name })
    .from(spools)
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .where(eq(spools.id, spoolId))
  if (!row) throw new Error("Spool not found")
  if (row.spool.userId === authUser.id) throw new Error("You can't borrow your own spool")

  const shared = await getSharedFilaments(groupId)
  if (!shared.some((f) => f.id === spoolId)) throw new Error("This spool isn't shared in this group")

  const [existing] = await db
    .select({ id: lends.id })
    .from(lends)
    .where(and(eq(lends.filamentId, spoolId), inArray(lends.status, ["requested", "active"])))
  if (existing) throw new Error("This spool already has a pending or active lend")

  const [created] = await db
    .insert(lends)
    .values({ filamentId: spoolId, groupId, borrowerId: authUser.id, status: "requested" })
    .returning()

  const [group] = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, groupId))
  await createNotification({
    userId: row.spool.userId,
    type: "lend_requested",
    actorName: authUser.name,
    filamentName: row.materialName,
    groupName: group?.name ?? "a group",
    lendId: created.id,
  })

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/")
}

// Returns the lend joined with the data needed for authz + notifications.
async function requireSpoolOwner(lendId: number, userId: string) {
  const [row] = await db
    .select({
      lend: lends,
      ownerId: spools.userId,
      materialName: materials.name,
      groupName: groups.name,
    })
    .from(lends)
    .innerJoin(spools, eq(lends.filamentId, spools.id))
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .innerJoin(groups, eq(lends.groupId, groups.id))
    .where(eq(lends.id, lendId))
  if (!row || row.ownerId !== userId) throw new Error("Not authorized")
  return row
}

export async function approveLend(lendId: number) {
  const authUser = await requireUser()
  const { lend, materialName, groupName } = await requireSpoolOwner(lendId, authUser.id)
  if (lend.status !== "requested") throw new Error("Lend request already handled")
  await db
    .update(lends)
    .set({ status: "active", respondedAt: new Date(), updatedAt: new Date() })
    .where(eq(lends.id, lendId))
  await createNotification({
    userId: lend.borrowerId,
    type: "lend_approved",
    actorName: authUser.name,
    filamentName: materialName,
    groupName,
    lendId,
  })
  revalidatePath(`/groups/${lend.groupId}`)
  revalidatePath("/")
}

export async function declineLend(lendId: number) {
  const authUser = await requireUser()
  const { lend, materialName, groupName } = await requireSpoolOwner(lendId, authUser.id)
  if (lend.status !== "requested") throw new Error("Lend request already handled")
  await db
    .update(lends)
    .set({ status: "declined", respondedAt: new Date(), updatedAt: new Date() })
    .where(eq(lends.id, lendId))
  await createNotification({
    userId: lend.borrowerId,
    type: "lend_declined",
    actorName: authUser.name,
    filamentName: materialName,
    groupName,
    lendId,
  })
  revalidatePath(`/groups/${lend.groupId}`)
}

export async function markReturned(lendId: number) {
  const authUser = await requireUser()
  const { lend, materialName, groupName } = await requireSpoolOwner(lendId, authUser.id)
  if (lend.status !== "active") throw new Error("Lend is not active")
  await db
    .update(lends)
    .set({ status: "returned", returnedAt: new Date(), updatedAt: new Date() })
    .where(eq(lends.id, lendId))
  await createNotification({
    userId: lend.borrowerId,
    type: "lend_returned",
    actorName: authUser.name,
    filamentName: materialName,
    groupName,
    lendId,
  })
  revalidatePath(`/groups/${lend.groupId}`)
  revalidatePath("/")
}

// Borrower withdraws their own pending request. The row is deleted —
// cancelled requests carry no history value (unlike declined ones).
export async function cancelLendRequest(lendId: number) {
  const authUser = await requireUser()
  const [row] = await db
    .select({
      lend: lends,
      ownerId: spools.userId,
      materialName: materials.name,
      groupName: groups.name,
    })
    .from(lends)
    .innerJoin(spools, eq(lends.filamentId, spools.id))
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .innerJoin(groups, eq(lends.groupId, groups.id))
    .where(eq(lends.id, lendId))
  if (!row || row.lend.borrowerId !== authUser.id) throw new Error("Not authorized")
  if (row.lend.status !== "requested") throw new Error("Only pending requests can be cancelled")

  await db.delete(lends).where(eq(lends.id, lendId))
  await createNotification({
    userId: row.ownerId,
    type: "lend_request_cancelled",
    actorName: authUser.name,
    filamentName: row.materialName,
    groupName: row.groupName,
  })
  revalidatePath(`/groups/${row.lend.groupId}`)
  revalidatePath("/")
}

const borrowerUser = alias(user, "borrower_user")
const ownerUser = alias(user, "owner_user")

// Active lends on the current user's own spools, for the "Lent to X" badge
// on the own dashboard.
export async function getActiveLendsForOwner() {
  const authUser = await requireUser()
  return db
    .select({ spoolId: lends.filamentId, borrowerName: borrowerUser.name })
    .from(lends)
    .innerJoin(spools, eq(lends.filamentId, spools.id))
    .innerJoin(borrowerUser, eq(lends.borrowerId, borrowerUser.id))
    .where(and(eq(spools.userId, authUser.id), eq(lends.status, "active")))
}

// Every lend the current user is involved in (as owner or borrower),
// across all groups, newest first — feeds the dashboard "Borrows" tab.
export async function getMyLends() {
  const authUser = await requireUser()
  return db
    .select({
      lend: lends,
      materialName: materials.name,
      materialManufacturer: materials.manufacturer,
      measuredTotalWeightGrams: spools.measuredTotalWeightGrams,
      emptyWeightGrams: spoolTypes.emptyWeightGrams,
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
    .where(or(eq(spools.userId, authUser.id), eq(lends.borrowerId, authUser.id)))
    .orderBy(desc(lends.requestedAt))
}

export type MyLend = Awaited<ReturnType<typeof getMyLends>>[number]
