import 'server-only';

import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { spools, spoolWeighings, type SpoolWeighing } from '@/lib/db/schema';

// The weighing history (spool_weighings) is append-only from every path that
// sets a spool's measured weight — call recordWeighing() right after writing
// spools.measuredTotalWeightGrams, so the newest row always equals it.

export async function recordWeighing(
  spoolId: string,
  grams: number,
  userId: string | null
) {
  await db.insert(spoolWeighings).values({ spoolId, grams, userId });
}

export async function getWeighings(
  spoolId: string,
  limit = 20
): Promise<SpoolWeighing[]> {
  return db
    .select()
    .from(spoolWeighings)
    .where(eq(spoolWeighings.spoolId, spoolId))
    .orderBy(desc(spoolWeighings.measuredAt), desc(spoolWeighings.id))
    .limit(limit);
}

// Drops the newest weighing and puts the spool back to the one before — the
// fix for a mistyped weight. Refuses when there is nothing to go back to.
// Callers authorize first (owner or active borrower).
export async function undoLastWeighing(spoolId: string): Promise<number> {
  return db.transaction(async (tx) => {
    // Lock the spool row so two undos can't both remove "the last" weighing.
    await tx
      .select({ id: spools.id })
      .from(spools)
      .where(eq(spools.id, spoolId))
      .for('update');
    const [latest, previous] = await tx
      .select()
      .from(spoolWeighings)
      .where(eq(spoolWeighings.spoolId, spoolId))
      .orderBy(desc(spoolWeighings.measuredAt), desc(spoolWeighings.id))
      .limit(2);
    if (!latest || !previous) throw new Error('Nothing to undo');
    await tx
      .delete(spoolWeighings)
      .where(
        and(
          eq(spoolWeighings.id, latest.id),
          eq(spoolWeighings.spoolId, spoolId)
        )
      );
    await tx
      .update(spools)
      .set({ measuredTotalWeightGrams: previous.grams, updatedAt: new Date() })
      .where(eq(spools.id, spoolId));
    return previous.grams;
  });
}
