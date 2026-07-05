"use server"

import { db } from "@/lib/db"
import { filaments, lends, user } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth-session"
import { getMembership, getSharedFilaments } from "@/lib/sharing"
import { and, desc, eq, inArray } from "drizzle-orm"
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

  await db.insert(lends).values({ filamentId, groupId, borrowerId: authUser.id, status: "requested" })
  revalidatePath(`/groups/${groupId}`)
}

async function requireFilamentOwner(lendId: number, userId: string) {
  const [row] = await db
    .select({ lend: lends, ownerId: filaments.userId })
    .from(lends)
    .innerJoin(filaments, eq(lends.filamentId, filaments.id))
    .where(eq(lends.id, lendId))
  if (!row || row.ownerId !== userId) throw new Error("Not authorized")
  return row.lend
}

export async function approveLend(lendId: number) {
  const authUser = await requireUser()
  const lend = await requireFilamentOwner(lendId, authUser.id)
  if (lend.status !== "requested") throw new Error("Lend request already handled")
  await db
    .update(lends)
    .set({ status: "active", respondedAt: new Date(), updatedAt: new Date() })
    .where(eq(lends.id, lendId))
  revalidatePath(`/groups/${lend.groupId}`)
  revalidatePath("/")
}

export async function declineLend(lendId: number) {
  const authUser = await requireUser()
  const lend = await requireFilamentOwner(lendId, authUser.id)
  if (lend.status !== "requested") throw new Error("Lend request already handled")
  await db
    .update(lends)
    .set({ status: "declined", respondedAt: new Date(), updatedAt: new Date() })
    .where(eq(lends.id, lendId))
  revalidatePath(`/groups/${lend.groupId}`)
}

export async function markReturned(lendId: number) {
  const authUser = await requireUser()
  const lend = await requireFilamentOwner(lendId, authUser.id)
  if (lend.status !== "active") throw new Error("Lend is not active")
  await db
    .update(lends)
    .set({ status: "returned", returnedAt: new Date(), updatedAt: new Date() })
    .where(eq(lends.id, lendId))
  revalidatePath(`/groups/${lend.groupId}`)
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

// Active + historical lends for a group, newest first.
export async function getGroupLends(groupId: number) {
  const authUser = await requireUser()
  const membership = await getMembership(groupId, authUser.id)
  if (!membership) throw new Error("Not a member of this group")

  return db
    .select({
      lend: lends,
      filamentName: filaments.name,
      filamentManufacturer: filaments.manufacturer,
      ownerId: filaments.userId,
      ownerName: ownerUser.name,
      borrowerName: borrowerUser.name,
    })
    .from(lends)
    .innerJoin(filaments, eq(lends.filamentId, filaments.id))
    .innerJoin(borrowerUser, eq(lends.borrowerId, borrowerUser.id))
    .innerJoin(ownerUser, eq(filaments.userId, ownerUser.id))
    .where(eq(lends.groupId, groupId))
    .orderBy(desc(lends.requestedAt))
}
