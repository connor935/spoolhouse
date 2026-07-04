"use server"

import { db } from "@/lib/db"
import { filaments, type NewFilament } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getFilaments() {
  return db.select().from(filaments).orderBy(desc(filaments.createdAt))
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
  const values: NewFilament = {
    name: input.name,
    manufacturer: input.manufacturer,
    filamentType: input.filamentType,
    color: input.color ?? null,
    emptySpoolWeight: input.emptySpoolWeight.toString(),
    fullFilamentWeight: input.fullFilamentWeight.toString(),
    measuredTotalWeight: input.measuredTotalWeight.toString(),
  }
  await db.insert(filaments).values(values)
  revalidatePath("/")
}

export async function updateFilament(id: number, input: FilamentInput) {
  await db
    .update(filaments)
    .set({
      name: input.name,
      manufacturer: input.manufacturer,
      filamentType: input.filamentType,
      color: input.color ?? null,
      emptySpoolWeight: input.emptySpoolWeight.toString(),
      fullFilamentWeight: input.fullFilamentWeight.toString(),
      measuredTotalWeight: input.measuredTotalWeight.toString(),
      updatedAt: new Date(),
    })
    .where(eq(filaments.id, id))
  revalidatePath("/")
}

// Quick re-weigh: store the new measured total weight from the scale.
// Filament left is derived from this minus the empty spool weight.
export async function setMeasuredWeight(id: number, measuredTotalWeight: number) {
  await db
    .update(filaments)
    .set({ measuredTotalWeight: measuredTotalWeight.toString(), updatedAt: new Date() })
    .where(eq(filaments.id, id))
  revalidatePath("/")
}

export async function deleteFilament(id: number) {
  await db.delete(filaments).where(eq(filaments.id, id))
  revalidatePath("/")
}
