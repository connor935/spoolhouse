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
import { and, desc, eq, or } from 'drizzle-orm';
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
};

// A material/spool type is usable if approved, or if the user submitted it.
async function assertMaterialUsable(materialId: string, userId: string) {
  const [m] = await db
    .select({ id: materials.id })
    .from(materials)
    .where(
      and(
        eq(materials.id, materialId),
        or(
          eq(materials.status, 'approved'),
          eq(materials.submittedById, userId)
        )
      )
    );
  if (!m) throw new Error('Unknown or unavailable material');
}

async function assertSpoolTypeUsable(spoolTypeId: string, userId: string) {
  const [st] = await db
    .select({ id: spoolTypes.id })
    .from(spoolTypes)
    .where(
      and(
        eq(spoolTypes.id, spoolTypeId),
        or(
          eq(spoolTypes.status, 'approved'),
          eq(spoolTypes.submittedById, userId)
        )
      )
    );
  if (!st) throw new Error('Unknown or unavailable spool type');
}

export async function createSpool(input: SpoolInput) {
  const user = await requireUser();
  await assertMaterialUsable(input.materialId, user.id);
  await assertSpoolTypeUsable(input.spoolTypeId, user.id);
  const values: NewSpool = {
    userId: user.id,
    materialId: input.materialId,
    spoolTypeId: input.spoolTypeId,
    fullFilamentWeightGrams: Math.round(input.fullFilamentWeightGrams),
    measuredTotalWeightGrams: Math.round(input.measuredTotalWeightGrams),
  };
  await db.insert(spools).values(values);
  revalidatePath('/');
  await emitSpoolChange(user.id);
}

export async function updateSpool(id: string, input: SpoolInput) {
  const user = await requireUser();
  await assertMaterialUsable(input.materialId, user.id);
  await assertSpoolTypeUsable(input.spoolTypeId, user.id);
  await db
    .update(spools)
    .set({
      materialId: input.materialId,
      spoolTypeId: input.spoolTypeId,
      fullFilamentWeightGrams: Math.round(input.fullFilamentWeightGrams),
      measuredTotalWeightGrams: Math.round(input.measuredTotalWeightGrams),
      updatedAt: new Date(),
    })
    .where(and(eq(spools.id, id), eq(spools.userId, user.id)));
  revalidatePath('/');
  await emitSpoolChange(user.id);
}

// Quick re-weigh: store the new measured total weight from the scale (g).
// Allowed for the owner AND for whoever currently borrows the spool
// (active lend) — the borrower is the one printing with it.
export async function setMeasuredWeight(
  id: string,
  measuredTotalWeightGrams: number
) {
  const user = await requireUser();
  const [spool] = await db
    .select({ userId: spools.userId })
    .from(spools)
    .where(eq(spools.id, id));
  if (!spool) throw new Error('Spool not found');

  if (spool.userId !== user.id) {
    const [activeBorrow] = await db
      .select({ id: lends.id })
      .from(lends)
      .where(
        and(
          eq(lends.filamentId, id),
          eq(lends.status, 'active'),
          eq(lends.borrowerId, user.id)
        )
      );
    if (!activeBorrow) throw new Error('Not authorized');
  }

  await db
    .update(spools)
    .set({
      measuredTotalWeightGrams: Math.round(measuredTotalWeightGrams),
      updatedAt: new Date(),
    })
    .where(eq(spools.id, id));
  revalidatePath('/');
  // Owner's id, not the actor's: the actor may be the borrower, and the
  // owner-based fan-out already includes every co-member (borrower too).
  await emitSpoolChange(spool.userId);
}

export async function deleteSpool(id: string) {
  const user = await requireUser();
  await db
    .delete(spools)
    .where(and(eq(spools.id, id), eq(spools.userId, user.id)));
  revalidatePath('/');
  await emitSpoolChange(user.id);
}
