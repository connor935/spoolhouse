import "server-only"

import { and, eq, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { spoolTypes } from "@/lib/db/schema"

// A spool type is usable if it's approved, or if the user submitted it —
// shared by the server actions and the REST API.
export async function isSpoolTypeUsable(spoolTypeId: number, userId: string): Promise<boolean> {
  const [st] = await db
    .select({ id: spoolTypes.id })
    .from(spoolTypes)
    .where(
      and(
        eq(spoolTypes.id, spoolTypeId),
        or(eq(spoolTypes.status, "approved"), eq(spoolTypes.submittedById, userId)),
      ),
    )
  return !!st
}

export async function assertSpoolTypeUsable(spoolTypeId: number, userId: string) {
  if (!(await isSpoolTypeUsable(spoolTypeId, userId))) {
    throw new Error("Unknown or unavailable spool type")
  }
}
