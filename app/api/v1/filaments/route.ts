import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { filaments, spoolTypes } from "@/lib/db/schema"
import { apiError, authenticateApiRequest, unauthorized } from "@/lib/api-auth"
import { isSpoolTypeUsable } from "@/lib/spool-type-usable"
import { parseFilamentBody, serializeFilament, type FilamentBody } from "./shared"

// GET /api/v1/filaments — the token owner's spools, newest first.
export async function GET(request: Request) {
  const owner = await authenticateApiRequest(request)
  if (!owner) return unauthorized()
  const rows = await db
    .select()
    .from(filaments)
    .innerJoin(spoolTypes, eq(filaments.spoolTypeId, spoolTypes.id))
    .where(eq(filaments.userId, owner.id))
    .orderBy(desc(filaments.createdAt))
  return Response.json({
    filaments: rows.map((r) => serializeFilament(r.filaments, r.spool_types)),
  })
}

// POST /api/v1/filaments — create a spool (same fields as the webapp form).
export async function POST(request: Request) {
  const owner = await authenticateApiRequest(request)
  if (!owner) return unauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON")
  }
  const parsed = parseFilamentBody(body, { partial: false })
  if (!parsed.ok) return apiError(400, "invalid_input", parsed.message)
  const input = parsed.value as FilamentBody

  if (!(await isSpoolTypeUsable(input.spoolTypeId, owner.id))) {
    return apiError(400, "invalid_input", "Unknown or unavailable spool type")
  }

  const [created] = await db
    .insert(filaments)
    .values({
      userId: owner.id,
      name: input.name,
      manufacturer: input.manufacturer,
      filamentType: input.filamentType,
      color: input.color ?? null,
      spoolTypeId: input.spoolTypeId,
      fullFilamentWeightGrams: input.fullFilamentWeightGrams,
      measuredTotalWeightGrams: input.measuredTotalWeightGrams,
    })
    .returning()
  const [st] = await db.select().from(spoolTypes).where(eq(spoolTypes.id, created.spoolTypeId))
  revalidatePath("/")
  return Response.json({ filament: serializeFilament(created, st) }, { status: 201 })
}
