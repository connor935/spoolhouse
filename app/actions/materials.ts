"use server"

import { db } from "@/lib/db"
import { materials, type Material } from "@/lib/db/schema"
import { requireAdmin, requireUser } from "@/lib/auth-session"
import { and, asc, eq, ne, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// Materials the current user may attach spools to: all approved ones, plus
// their own pending submissions (same rule as spool types).
export async function getUsableMaterials() {
  const user = await requireUser()
  return db
    .select()
    .from(materials)
    .where(or(eq(materials.status, "approved"), eq(materials.submittedById, user.id)))
    .orderBy(asc(materials.manufacturer), asc(materials.name))
}

export async function getMaterialCatalog() {
  return getUsableMaterials()
}

type MaterialInput = {
  manufacturer: string
  name: string
  filamentType: string
  color?: string | null
}

function validateMaterialInput(input: MaterialInput) {
  const manufacturer = input.manufacturer.trim()
  const name = input.name.trim()
  const filamentType = input.filamentType.trim()
  if (!manufacturer || !name || !filamentType) {
    throw new Error("Manufacturer, name and filament type are required")
  }
  return { manufacturer, name, filamentType, color: input.color ?? null }
}

// Any user can request a new material; it lands as `pending` and is
// immediately usable by the submitter. Returns the created row.
export async function requestMaterial(input: MaterialInput): Promise<Material> {
  const user = await requireUser()
  const values = validateMaterialInput(input)
  const [created] = await db
    .insert(materials)
    .values({ ...values, status: "pending", submittedById: user.id })
    .returning()
  revalidatePath("/materials")
  revalidatePath("/admin/materials")
  return created
}

// --- Admin review ---

export async function getPendingMaterials() {
  await requireAdmin()
  return db
    .select()
    .from(materials)
    .where(eq(materials.status, "pending"))
    .orderBy(asc(materials.createdAt))
}

export async function approveMaterial(id: number, edits?: MaterialInput) {
  const admin = await requireAdmin()
  const fields = edits ? validateMaterialInput(edits) : {}
  await db
    .update(materials)
    .set({ ...fields, status: "approved", reviewedById: admin.id, updatedAt: new Date() })
    .where(and(eq(materials.id, id), ne(materials.status, "approved")))
  revalidatePath("/materials")
  revalidatePath("/admin/materials")
}

export async function rejectMaterial(id: number) {
  const admin = await requireAdmin()
  await db
    .update(materials)
    .set({ status: "rejected", reviewedById: admin.id, updatedAt: new Date() })
    .where(and(eq(materials.id, id), ne(materials.status, "approved")))
  revalidatePath("/materials")
  revalidatePath("/admin/materials")
}
