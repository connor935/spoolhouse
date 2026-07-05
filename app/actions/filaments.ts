"use server"

import { db } from "@/lib/db"
import { filaments, type NewFilament } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth-session"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getFilaments() {
  const user = await requireUser()
  return db
    .select()
    .from(filaments)
    .where(eq(filaments.userId, user.id))
    .orderBy(desc(filaments.createdAt))
}

type FilamentInput = {
  name: string
  manufacturer: string
  filamentType: string
  color?: string | null
  emptySpoolWeight: number
  fullFilamentWeight: number
  measuredTotalWeight: number
}

export async function createFilament(input: FilamentInput) {
  const user = await requireUser()
  const values: NewFilament = {
    userId: user.id,
    name: input.name,
    manufacturer: input.manufacturer,
    filamentType: input.filamentType,
    color: input.color ?? null,
    emptySpoolWeight: input.emptySpoolWeight,
    fullFilamentWeight: input.fullFilamentWeight,
    measuredTotalWeight: input.measuredTotalWeight,
  }
  await db.insert(filaments).values(values)
  revalidatePath("/")
}

export async function updateFilament(id: number, input: FilamentInput) {
  const user = await requireUser()
  await db
    .update(filaments)
    .set({
      name: input.name,
      manufacturer: input.manufacturer,
      filamentType: input.filamentType,
      color: input.color ?? null,
      emptySpoolWeight: input.emptySpoolWeight,
      fullFilamentWeight: input.fullFilamentWeight,
      measuredTotalWeight: input.measuredTotalWeight,
      updatedAt: new Date(),
    })
    .where(and(eq(filaments.id, id), eq(filaments.userId, user.id)))
  revalidatePath("/")
}

// Quick re-weigh: store the new measured total weight from the scale.
// Filament left is derived from this minus the empty spool weight.
export async function setMeasuredWeight(id: number, measuredTotalWeight: number) {
  const user = await requireUser()
  await db
    .update(filaments)
    .set({ measuredTotalWeight, updatedAt: new Date() })
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
