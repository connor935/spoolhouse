import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { filaments, spoolTypes } from "@/lib/db/schema"
import { apiError, authenticateApiRequest, unauthorized } from "@/lib/api-auth"
import { parseId, serializeFilament } from "../../shared"

type RouteContext = { params: Promise<{ id: string }> }

// PUT /api/v1/filaments/:id/weight — re-weigh: store the new measured total
// weight from the scale (g). Filament left is derived from this minus the
// spool type's empty weight. The core call for scale integrations.
export async function PUT(request: Request, { params }: RouteContext) {
  const owner = await authenticateApiRequest(request)
  if (!owner) return unauthorized()
  const id = parseId((await params).id)
  if (!id) return apiError(404, "not_found", "Filament not found")

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON")
  }
  const grams = (body as Record<string, unknown> | null)?.measuredTotalWeightGrams
  if (typeof grams !== "number" || !Number.isFinite(grams) || Math.round(grams) < 0) {
    return apiError(400, "invalid_input", "measuredTotalWeightGrams must be a number ≥ 0 (grams)")
  }

  const [updated] = await db
    .update(filaments)
    .set({ measuredTotalWeightGrams: Math.round(grams), updatedAt: new Date() })
    .where(and(eq(filaments.id, id), eq(filaments.userId, owner.id)))
    .returning()
  if (!updated) return apiError(404, "not_found", "Filament not found")

  const [st] = await db.select().from(spoolTypes).where(eq(spoolTypes.id, updated.spoolTypeId))
  revalidatePath("/")
  return Response.json({ filament: serializeFilament(updated, st) })
}
