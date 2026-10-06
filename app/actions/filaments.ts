'use server';

import { db } from '@/lib/db';
import {
  lends,
  materials,
  spools,
  spoolTypes,
  type NewSpool,
} from '@/lib/db/schema';
import { requireUser } from '@/lib/auth-session';
import { emitSpoolChange } from '@/lib/events';
import { assertMaterialUsable } from '@/lib/material-usable';
import { assertSpoolTypeUsable } from '@/lib/spool-type-usable';
import {
  idSchema,
  measuredWeightSchema,
  parseOrThrow,
  spoolInputSchema,
} from '@/lib/schemas';
import {
  getWeighings,
  recordWeighing,
  undoLastWeighing as undoLastWeighingRow,
} from '@/lib/weighings';
import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// The user's inventory: spool + material + spool type rows (grouped into
// materials client-side via groupInventory()).
export async function getInventory() {
  const user = await requireUser();
  return db
    .select({ spool: spools, material: materials, spoolType: spoolTypes })
    .from(spools)
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .innerJoin(spoolTypes, eq(spools.spoolTypeId, spoolTypes.id))
    .where(eq(spools.userId, user.id))
    .orderBy(desc(spools.createdAt));
}

type SpoolInput = {
  materialId: string;
  spoolTypeId: string;
  fullFilamentWeightGrams: number;
  measuredTotalWeightGrams: number;
  pricePaidCents?: number | null;
  purchasedAt?: string | null;
  location?: string | null;
  lastDriedAt?: string | null;
};

export async function createSpool(rawInput: SpoolInput) {
  const user = await requireUser();
  const input = parseOrThrow(spoolInputSchema, rawInput);
  await assertMaterialUsable(input.materialId, user.id);
  await assertSpoolTypeUsable(input.spoolTypeId, user.id);
  const values: NewSpool = { userId: user.id, ...input };
  const [created] = await db
    .insert(spools)
    .values(values)
    .returning({ id: spools.id });
  await recordWeighing(created.id, input.measuredTotalWeightGrams, user.id);
  revalidatePath('/');
  await emitSpoolChange(user.id);
}

export async function updateSpool(id: string, rawInput: SpoolInput) {
  const user = await requireUser();
  const input = parseOrThrow(spoolInputSchema, rawInput);
  await assertMaterialUsable(input.materialId, user.id);
  await assertSpoolTypeUsable(input.spoolTypeId, user.id);
  const [before] = await db
    .select({ grams: spools.measuredTotalWeightGrams })
    .from(spools)
    .where(and(eq(spools.id, id), eq(spools.userId, user.id)));
  if (!before) throw new Error('Spool not found');
  await db
    .update(spools)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(spools.id, id), eq(spools.userId, user.id)));
  // The edit dialog is also how the owner re-weighs; other edits (price,
  // location, …) must not add a weighing.
  if (before.grams !== input.measuredTotalWeightGrams)
    await recordWeighing(id, input.measuredTotalWeightGrams, user.id);
  revalidatePath('/');
  await emitSpoolChange(user.id);
}

// The owner, or whoever currently borrows the spool (active lend) — the
// borrower is the one printing with it. Returns the owner's id.
async function requireWeigher(spoolId: string, userId: string) {
  const [spool] = await db
    .select({ userId: spools.userId })
    .from(spools)
    .where(eq(spools.id, spoolId));
  if (!spool) throw new Error('Spool not found');

  if (spool.userId !== userId) {
    const [activeBorrow] = await db
      .select({ id: lends.id })
      .from(lends)
      .where(
        and(
          eq(lends.filamentId, spoolId),
          eq(lends.status, 'active'),
          eq(lends.borrowerId, userId)
        )
      );
    if (!activeBorrow) throw new Error('Not authorized');
  }
  return spool.userId;
}

// Quick re-weigh: store the new measured total weight from the scale (g).
// Allowed for the owner AND the active borrower (requireWeigher).
export async function setMeasuredWeight(id: string, rawWeightGrams: number) {
  const user = await requireUser();
  const measuredTotalWeightGrams = parseOrThrow(
    measuredWeightSchema,
    rawWeightGrams
  );
  const ownerId = await requireWeigher(id, user.id);

  await db
    .update(spools)
    .set({ measuredTotalWeightGrams, updatedAt: new Date() })
    .where(eq(spools.id, id));
  await recordWeighing(id, measuredTotalWeightGrams, user.id);
  revalidatePath('/');
  // Owner's id, not the actor's: the actor may be the borrower, and the
  // owner-based fan-out already includes every co-member (borrower too).
  await emitSpoolChange(ownerId);
}

// The spool's recent weighings, newest first (edit dialog history).
export async function getSpoolWeighings(id: string) {
  const user = await requireUser();
  const spoolId = parseOrThrow(idSchema, id);
  await requireWeigher(spoolId, user.id);
  return getWeighings(spoolId);
}

// Reverts a mistyped weight: drops the newest weighing and restores the
// previous value. Same permission as re-weighing.
export async function undoLastWeighing(id: string) {
  const user = await requireUser();
  const spoolId = parseOrThrow(idSchema, id);
  const ownerId = await requireWeigher(spoolId, user.id);
  const grams = await undoLastWeighingRow(spoolId);
  revalidatePath('/');
  await emitSpoolChange(ownerId);
  return grams;
}

// "Dried today" — resets the drying hint. Owner only (it's their storage).
export async function markDried(id: string) {
  const user = await requireUser();
  const spoolId = parseOrThrow(idSchema, id);
  const updated = await db
    .update(spools)
    .set({ lastDriedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(spools.id, spoolId), eq(spools.userId, user.id)))
    .returning({ id: spools.id });
  if (updated.length === 0) throw new Error('Spool not found');
  revalidatePath('/');
  await emitSpoolChange(user.id);
}

export async function deleteSpool(id: string) {
  const user = await requireUser();
  await db
    .delete(spools)
    .where(and(eq(spools.id, id), eq(spools.userId, user.id)));
  revalidatePath('/');
  await emitSpoolChange(user.id);
}
