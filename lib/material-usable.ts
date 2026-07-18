import 'server-only';

import { and, eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { materials } from '@/lib/db/schema';

// A material is usable if it's approved, or if the user submitted it —
// mirrors lib/spool-type-usable.ts, shared by server actions and the REST API.
export async function isMaterialUsable(
  materialId: number,
  userId: string
): Promise<boolean> {
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
  return !!m;
}
