import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { spools } from "@/lib/db/schema"
import { apiError, authenticateApiRequest, unauthorized } from "@/lib/api-auth"
import { emitSpoolChange } from "@/lib/events"
import { isSpoolTypeUsable } from "@/lib/spool-type-usable"
import { isMaterialUsable } from "@/lib/material-usable"
import { getOwnedSpool, parseId, parseSpoolBody, serializeSpool } from "../shared"

type RouteContext = { params: Promise<{ id: string }> }

const notFound = () => apiError(404, "not_found", "Spool not found")

// GET /api/v1/spools/:id
export async function GET(request: Request, { params }: RouteContext) {
  const owner = await authenticateApiRequest(request)
  if (!owner) return unauthorized()
  const id = parseId((await params).id)
  if (!id) return notFound()
  const row = await getOwnedSpool(id, owner.id)
  if (!row) return notFound()
  return Response.json({ spool: serializeSpool(row) })
}

// PATCH /api/v1/spools/:id — partial update of the input fields.
export async function PATCH(request: Request, { params }: RouteContext) {
  const owner = await authenticateApiRequest(request)
  if (!owner) return unauthorized()
  const id = parseId((await params).id)
  if (!id) return notFound()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON")
  }
  const parsed = parseSpoolBody(body, { partial: true })
  if (!parsed.ok) return apiError(400, "invalid_input", parsed.message)
  if (Object.keys(parsed.value).length === 0) {
    return apiError(400, "invalid_input", "No updatable fields in request body")
  }
  if (parsed.value.materialId !== undefined && !(await isMaterialUsable(parsed.value.materialId, owner.id))) {
    return apiError(400, "invalid_input", "Unknown or unavailable material")
  }
  if (parsed.value.spoolTypeId !== undefined && !(await isSpoolTypeUsable(parsed.value.spoolTypeId, owner.id))) {
    return apiError(400, "invalid_input", "Unknown or unavailable spool type")
  }

  const result = await db
    .update(spools)
    .set({ ...parsed.value, updatedAt: new Date() })
    .where(and(eq(spools.id, id), eq(spools.userId, owner.id)))
    .returning({ id: spools.id })
  if (result.length === 0) return notFound()

  revalidatePath("/")
  await emitSpoolChange(owner.id)
  const row = await getOwnedSpool(id, owner.id)
  return Response.json({ spool: serializeSpool(row!) })
}

// DELETE /api/v1/spools/:id
export async function DELETE(request: Request, { params }: RouteContext) {
  const owner = await authenticateApiRequest(request)
  if (!owner) return unauthorized()
  const id = parseId((await params).id)
  if (!id) return notFound()
  const deleted = await db
    .delete(spools)
    .where(and(eq(spools.id, id), eq(spools.userId, owner.id)))
    .returning({ id: spools.id })
  if (deleted.length === 0) return notFound()
  revalidatePath("/")
  await emitSpoolChange(owner.id)
  return new Response(null, { status: 204 })
}
