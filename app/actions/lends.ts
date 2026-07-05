"use server"

import { db } from "@/lib/db"
import { filaments, groups, lends, spoolTypes, user } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth-session"
import { createNotification } from "@/lib/notifications"
import { getMembership, getSharedFilaments } from "@/lib/sharing"
import { and, desc, eq, inArray, or } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import { revalidatePath } from "next/cache"

export async function requestLend(filamentId: number, groupId: number) {
  const authUser = await requireUser()
  const membership = await getMembership(groupId, authUser.id)
  if (!membership) throw new Error("Not a member of this group")

  const [filament] = await db.select().from(filaments).where(eq(filaments.id, filamentId))
  if (!filament) throw new Error("Spool not found")
  if (filament.userId === authUser.id) throw new Error("You can't borrow your own spool")

  const shared = await getSharedFilaments(groupId)
  if (!shared.some((f) => f.id === filamentId)) throw new Error("This spool isn't shared in this group")

  const [existing] = await db
    .select({ id: lends.id })
    .from(lends)
    .where(and(eq(lends.filamentId, filamentId), inArray(lends.status, ["requested", "active"])))
  if (existing) throw new Error("This spool already has a pending or active lend")

  const [created] = await db
    .insert(lends)
    .values({ filamentId, groupId, borrowerId: authUser.id, status: "requested" })
    .returning()

  const [group] = await db.select({ name: groups.name }).from(groups).where(eq(groups.id, groupId))
  await createNotification({
    userId: filament.userId,
    type: "lend_requested",
    actorName: authUser.name,
    filamentName: filament.name,
    groupName: group?.name ?? "a group",
    lendId: created.id,
  })

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/")
}

// Returns the lend joined with the data needed for authz + notifications.
async function requireFilamentOwner(lendId: number, userId: string) {
  const [row] = await db
    .select({
      lend: lends,
      ownerId: filaments.userId,
      filamentName: filaments.name,
      groupName: groups.name,
    })
    .from(lends)
    .innerJoin(filaments, eq(lends.filamentId, filaments.id))
    .innerJoin(groups, eq(lends.groupId, groups.id))
    .where(eq(lends.id, lendId))
  if (!row || row.ownerId !== userId) throw new Error("Not authorized")
  return row
}

export async function approveLend(lendId: number) {
  const authUser = await requireUser()
  const { lend, filamentName, groupName } = await requireFilamentOwner(lendId, authUser.id)
  if (lend.status !== "requested") throw new Error("Lend request already handled")
  await db
    .update(lends)
    .set({ status: "active", respondedAt: new Date(), updatedAt: new Date() })
    .where(eq(lends.id, lendId))
  await createNotification({
    userId: lend.borrowerId,
    type: "lend_approved",
    actorName: authUser.name,
    filamentName,
    groupName,
    lendId,
  })
  revalidatePath(`/groups/${lend.groupId}`)
  revalidatePath("/")
}

export async function declineLend(lendId: number) {
  const authUser = await requireUser()
  const { lend, filamentName, groupName } = await requireFilamentOwner(lendId, authUser.id)
  if (lend.status !== "requested") throw new Error("Lend request already handled")
  await db
    .update(lends)
    .set({ status: "declined", respondedAt: new Date(), updatedAt: new Date() })
    .where(eq(lends.id, lendId))
  await createNotification({
    userId: lend.borrowerId,
    type: "lend_declined",
    actorName: authUser.name,
    filamentName,
    groupName,
    lendId,
  })
  revalidatePath(`/groups/${lend.groupId}`)
}

export async function markReturned(lendId: number) {
  const authUser = await requireUser()
  const { lend, filamentName, groupName } = await requireFilamentOwner(lendId, authUser.id)
  if (lend.status !== "active") throw new Error("Lend is not active")
  await db
    .update(lends)
    .set({ status: "returned", returnedAt: new Date(), updatedAt: new Date() })
    .where(eq(lends.id, lendId))
  await createNotification({
    userId: lend.borrowerId,
    type: "lend_returned",
    actorName: authUser.name,
    filamentName,
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
      ownerId: filaments.userId,
      filamentName: filaments.name,
      groupName: groups.name,
    })
    .from(lends)
    .innerJoin(filaments, eq(lends.filamentId, filaments.id))
    .innerJoin(groups, eq(lends.groupId, groups.id))
    .where(eq(lends.id, lendId))
  if (!row || row.lend.borrowerId !== authUser.id) throw new Error("Not authorized")
  if (row.lend.status !== "requested") throw new Error("Only pending requests can be cancelled")

  await db.delete(lends).where(eq(lends.id, lendId))
  await createNotification({
    userId: row.ownerId,
    type: "lend_request_cancelled",
    actorName: authUser.name,
    filamentName: row.filamentName,
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
    .select({ filamentId: lends.filamentId, borrowerName: borrowerUser.name })
    .from(lends)
    .innerJoin(filaments, eq(lends.filamentId, filaments.id))
    .innerJoin(borrowerUser, eq(lends.borrowerId, borrowerUser.id))
    .where(and(eq(filaments.userId, authUser.id), eq(lends.status, "active")))
}

// Every lend the current user is involved in (as owner or borrower),
// across all groups, newest first — feeds the dashboard "Borrows" tab.
export async function getMyLends() {
  const authUser = await requireUser()
  return db
    .select({
      lend: lends,
      filamentName: filaments.name,
      filamentManufacturer: filaments.manufacturer,
      measuredTotalWeightGrams: filaments.measuredTotalWeightGrams,
      emptyWeightGrams: spoolTypes.emptyWeightGrams,
      ownerId: filaments.userId,
      ownerName: ownerUser.name,
      borrowerName: borrowerUser.name,
      groupName: groups.name,
    })
    .from(lends)
    .innerJoin(filaments, eq(lends.filamentId, filaments.id))
    .innerJoin(spoolTypes, eq(filaments.spoolTypeId, spoolTypes.id))
    .innerJoin(borrowerUser, eq(lends.borrowerId, borrowerUser.id))
    .innerJoin(ownerUser, eq(filaments.userId, ownerUser.id))
    .innerJoin(groups, eq(lends.groupId, groups.id))
    .where(or(eq(filaments.userId, authUser.id), eq(lends.borrowerId, authUser.id)))
    .orderBy(desc(lends.requestedAt))
}

export type MyLend = Awaited<ReturnType<typeof getMyLends>>[number]
