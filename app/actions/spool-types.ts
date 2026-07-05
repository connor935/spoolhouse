"use server"

import { db } from "@/lib/db"
import { spoolTypes, type SpoolType } from "@/lib/db/schema"
import { requireAdmin, requireUser } from "@/lib/auth-session"
import { and, asc, eq, ne, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// Spool types the current user may attach to a filament:
// all approved ones, plus their own pending submissions (Q3: usable immediately).
export async function getUsableSpoolTypes() {
  const user = await requireUser()
  return db
    .select()
    .from(spoolTypes)
    .where(or(eq(spoolTypes.status, "approved"), eq(spoolTypes.submittedById, user.id)))
    .orderBy(asc(spoolTypes.manufacturer), asc(spoolTypes.name))
}

// Catalog view: approved for everyone + the user's own non-approved submissions.
export async function getSpoolTypeCatalog() {
  return getUsableSpoolTypes()
}

type SpoolTypeInput = {
  manufacturer: string
  name: string
  emptyWeightGrams: number
}

function validateSpoolTypeInput(input: SpoolTypeInput) {
  const manufacturer = input.manufacturer.trim()
  const name = input.name.trim()
  const emptyWeightGrams = Math.round(input.emptyWeightGrams)
  if (!manufacturer || !name) throw new Error("Manufacturer and name are required")
  if (!Number.isFinite(emptyWeightGrams) || emptyWeightGrams <= 0) {
    throw new Error("Empty spool weight must be greater than 0 g")
  }
  return { manufacturer, name, emptyWeightGrams }
}

// Any user can request a new spool type; it lands as `pending` and is
// immediately usable by the submitter. Returns the created row.
export async function requestSpoolType(input: SpoolTypeInput): Promise<SpoolType> {
  const user = await requireUser()
  const values = validateSpoolTypeInput(input)
  const [created] = await db
    .insert(spoolTypes)
    .values({ ...values, status: "pending", submittedById: user.id })
    .returning()
  revalidatePath("/spool-types")
  revalidatePath("/admin/spool-types")
  return created
}

// --- Admin review ---

export async function getPendingSpoolTypes() {
  await requireAdmin()
  return db
    .select()
    .from(spoolTypes)
    .where(eq(spoolTypes.status, "pending"))
    .orderBy(asc(spoolTypes.createdAt))
}

export async function approveSpoolType(id: number, edits?: SpoolTypeInput) {
  const admin = await requireAdmin()
  const fields = edits ? validateSpoolTypeInput(edits) : {}
  await db
    .update(spoolTypes)
    .set({ ...fields, status: "approved", reviewedById: admin.id, updatedAt: new Date() })
    .where(and(eq(spoolTypes.id, id), ne(spoolTypes.status, "approved")))
  revalidatePath("/spool-types")
  revalidatePath("/admin/spool-types")
}

export async function rejectSpoolType(id: number) {
  const admin = await requireAdmin()
  await db
    .update(spoolTypes)
    .set({ status: "rejected", reviewedById: admin.id, updatedAt: new Date() })
    .where(and(eq(spoolTypes.id, id), ne(spoolTypes.status, "approved")))
  revalidatePath("/spool-types")
  revalidatePath("/admin/spool-types")
}
