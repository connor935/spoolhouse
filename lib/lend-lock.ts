import 'server-only';

import { and, eq, notExists, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { lends, spools } from '@/lib/db/schema';

// While a spool is lent out (an `active` lend) it is physically with the
// borrower. Only the borrower may re-weigh it then; the owner cannot edit,
// re-weigh, undo a weighing, mark it dried or delete it until they mark it
// returned. Pending requests don't lock anything — the spool is still home.

export const LENT_OUT_MESSAGE =
  "This spool is lent out — you can change it again once it's returned.";

/** `WHERE` condition on `spools`: no active lend on this row. */
export function notLentOut(): SQL {
  return notExists(
    db
      .select({ id: lends.id })
      .from(lends)
      .where(and(eq(lends.filamentId, spools.id), eq(lends.status, 'active')))
  );
}

export async function isLentOut(spoolId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: lends.id })
    .from(lends)
    .where(and(eq(lends.filamentId, spoolId), eq(lends.status, 'active')))
    .limit(1);
  return !!row;
}
