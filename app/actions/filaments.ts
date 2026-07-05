"use server"

import { db } from "@/lib/db"
import { filaments, spoolTypes, type NewFilament } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth-session"
import { assertSpoolTypeUsable } from "@/lib/spool-type-usable"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getFilaments() {
  const user = await requireUser()
  return db
    .select()
    .from(filaments)
    .innerJoin(spoolTypes, eq(filaments.spoolTypeId, spoolTypes.id))
    .where(eq(filaments.userId, user.id))
    .orderBy(desc(filaments.createdAt))
}

type FilamentInput = {
  name: string
  manufacturer: string
  filamentType: string
  color?: string | null
  spoolTypeId: number
  fullFilamentWeightGrams: number
  measuredTotalWeightGrams: number
}

export async function createFilament(input: FilamentInput) {
  const user = await requireUser()
  await assertSpoolTypeUsable(input.spoolTypeId, user.id)
  const values: NewFilament = {
    userId: user.id,
    name: input.name,
    manufacturer: input.manufacturer,
    filamentType: input.filamentType,
    color: input.color ?? null,
    spoolTypeId: input.spoolTypeId,
    fullFilamentWeightGrams: Math.round(input.fullFilamentWeightGrams),
    measuredTotalWeightGrams: Math.round(input.measuredTotalWeightGrams),
  }
  await db.insert(filaments).values(values)
  revalidatePath("/")
}

export async function updateFilament(id: number, input: FilamentInput) {
  const user = await requireUser()
  await assertSpoolTypeUsable(input.spoolTypeId, user.id)
  await db
    .update(filaments)
    .set({
      name: input.name,
      manufacturer: input.manufacturer,
      filamentType: input.filamentType,
      color: input.color ?? null,
      spoolTypeId: input.spoolTypeId,
      fullFilamentWeightGrams: Math.round(input.fullFilamentWeightGrams),
      measuredTotalWeightGrams: Math.round(input.measuredTotalWeightGrams),
      updatedAt: new Date(),
    })
    .where(and(eq(filaments.id, id), eq(filaments.userId, user.id)))
  revalidatePath("/")
}

// Quick re-weigh: store the new measured total weight from the scale (g).
// Filament left is derived from this minus the spool type's empty weight.
export async function setMeasuredWeight(id: number, measuredTotalWeightGrams: number) {
  const user = await requireUser()
  await db
    .update(filaments)
    .set({ measuredTotalWeightGrams: Math.round(measuredTotalWeightGrams), updatedAt: new Date() })
    .where(and(eq(filaments.id, id), eq(filaments.userId, user.id)))
  revalidatePath("/")
}

export async function deleteFilament(id: number) {
  const user = await requireUser()
  await db
    .delete(filaments)
    .where(and(eq(filaments.id, id), eq(filaments.userId, user.id)))
  revalidatePath("/")
}
