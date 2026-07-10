import { asc, eq, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { spoolTypes } from "@/lib/db/schema"
import { authenticateApiRequest, unauthorized } from "@/lib/api-auth"

// GET /api/v1/spool-types — spool types the token owner may attach to a
// filament: all approved ones plus their own pending submissions.
export async function GET(request: Request) {
  const owner = await authenticateApiRequest(request)
  if (!owner) return unauthorized()
  const rows = await db
    .select()
    .from(spoolTypes)
    .where(or(eq(spoolTypes.status, "approved"), eq(spoolTypes.submittedById, owner.id)))
    .orderBy(asc(spoolTypes.manufacturer), asc(spoolTypes.name))
  return Response.json({
    spoolTypes: rows.map((st) => ({
      id: st.id,
      manufacturer: st.manufacturer,
      name: st.name,
      emptyWeightGrams: st.emptyWeightGrams,
      status: st.status,
    })),
  })
}
