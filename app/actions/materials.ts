"use server"

import { db } from "@/lib/db"
import { materials, spools, type Material } from "@/lib/db/schema"
import { requireAdmin, requireUser } from "@/lib/auth-session"
import { and, asc, count, eq, ne, or } from "drizzle-orm"
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

// --- Edit & delete (I.3) ---

export type MaterialWithUsage = Material & { spoolCount: number }

// Full catalog for the admin management list, incl. how many spools
// reference each material (governs whether it can be deleted).
export async function getAllMaterialsForAdmin(): Promise<MaterialWithUsage[]> {
  await requireAdmin()
  const rows = await db
    .select({ material: materials, spoolCount: count(spools.id) })
    .from(materials)
    .leftJoin(spools, eq(spools.materialId, materials.id))
    .groupBy(materials.id)
    .orderBy(asc(materials.manufacturer), asc(materials.name))
  return rows.map((r) => ({ ...r.material, spoolCount: r.spoolCount }))
}

// Admin can edit any material, anytime, without changing its status.
// The submitter can edit their own material while it's pending or rejected
// (never once approved — it's global and others may reference it); editing
// a rejected entry resubmits it as pending for re-review.
export async function updateMaterial(id: number, input: MaterialInput) {
  const user = await requireUser()
  const [existing] = await db.select().from(materials).where(eq(materials.id, id))
  if (!existing) throw new Error("Material not found")

  const isAdmin = user.role === "admin"
  const isOwnEditable = existing.submittedById === user.id && existing.status !== "approved"
  if (!isAdmin && !isOwnEditable) throw new Error("Not authorized to edit this material")

  const values = validateMaterialInput(input)
  await db
    .update(materials)
    .set({ ...values, status: isAdmin ? existing.status : "pending", updatedAt: new Date() })
    .where(eq(materials.id, id))
  revalidatePath("/materials")
  revalidatePath("/admin/materials")
}

// Admin-only, and only when no spool references it (no data migration on
// delete — see the DB-setup notes: FK enforcement is off, so this check is
// the only thing preventing dangling spool.materialId references).
export async function deleteMaterial(id: number) {
  await requireAdmin()
  const [usage] = await db.select({ count: count() }).from(spools).where(eq(spools.materialId, id))
  if (usage.count > 0) throw new Error("Material is in use by existing spools")
  await db.delete(materials).where(eq(materials.id, id))
  revalidatePath("/materials")
  revalidatePath("/admin/materials")
}
