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
  measuredWeightSchema,
  parseOrThrow,
  spoolInputSchema,
} from '@/lib/schemas';
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
};

export async function createSpool(rawInput: SpoolInput) {
  const user = await requireUser();
  const input = parseOrThrow(spoolInputSchema, rawInput);
  await assertMaterialUsable(input.materialId, user.id);
  await assertSpoolTypeUsable(input.spoolTypeId, user.id);
  const values: NewSpool = { userId: user.id, ...input };
  await db.insert(spools).values(values);
  revalidatePath('/');
  await emitSpoolChange(user.id);
}

export async function updateSpool(id: string, rawInput: SpoolInput) {
  const user = await requireUser();
  const input = parseOrThrow(spoolInputSchema, rawInput);
  await assertMaterialUsable(input.materialId, user.id);
  await assertSpoolTypeUsable(input.spoolTypeId, user.id);
  await db
    .update(spools)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(spools.id, id), eq(spools.userId, user.id)));
  revalidatePath('/');
  await emitSpoolChange(user.id);
}

// Quick re-weigh: store the new measured total weight from the scale (g).
// Allowed for the owner AND for whoever currently borrows the spool
// (active lend) — the borrower is the one printing with it.
export async function setMeasuredWeight(id: string, rawWeightGrams: number) {
  const user = await requireUser();
  const measuredTotalWeightGrams = parseOrThrow(
    measuredWeightSchema,
    rawWeightGrams
  );
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
    .set({ measuredTotalWeightGrams, updatedAt: new Date() })
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
