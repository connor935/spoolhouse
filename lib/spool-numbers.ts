import 'server-only';

import { inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { spools } from '@/lib/db/schema';

/**
 * Each spool's "#03" number: its position in its owner's oldest-first list
 * of that material, the order groupInventory() shows the owner. Counted in
 * SQL over all the owner's spools of the material (empty and unshared ones
 * too), so borrowers and group members see the owner's numbers.
 */
export async function getSpoolNumbers(
  spoolIds: string[]
): Promise<Map<string, number>> {
  if (spoolIds.length === 0) return new Map();
  const pairs = db
    .select({ userId: spools.userId, materialId: spools.materialId })
    .from(spools)
    .where(inArray(spools.id, spoolIds));
  const ranked = db
    .select({
      id: spools.id,
      n: sql<number>`row_number() over (partition by ${spools.userId}, ${spools.materialId} order by ${spools.createdAt}, ${spools.id})`
        .mapWith(Number)
        .as('n'),
    })
    .from(spools)
    .where(sql`(${spools.userId}, ${spools.materialId}) in ${pairs}`)
    .as('ranked');
  const rows = await db
    .select()
    .from(ranked)
    .where(inArray(ranked.id, spoolIds));
  return new Map(rows.map((r) => [r.id, r.n]));
}
