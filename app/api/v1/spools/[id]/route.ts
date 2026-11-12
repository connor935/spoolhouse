import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { spools } from '@/lib/db/schema';
import { apiError, authenticateApiRequest, unauthorized } from '@/lib/api-auth';
import { emitSpoolChange } from '@/lib/events';
import { recordWeighing } from '@/lib/weighings';
import { isSpoolTypeUsable } from '@/lib/spool-type-usable';
import { isMaterialUsable } from '@/lib/material-usable';
import { isLentOut, notLentOut } from '@/lib/lend-lock';
import { firstIssueMessage, spoolBodySchema } from '@/lib/schemas';
import {
  getOwnedSpool,
  isTagConflict,
  lentOut,
  parseId,
  serializeSpool,
  tagConflict,
} from '../shared';

type RouteContext = { params: Promise<{ id: string }> };

const notFound = () => apiError(404, 'not_found', 'Spool not found');

// GET /api/v1/spools/:id
export async function GET(request: Request, { params }: RouteContext) {
  const owner = await authenticateApiRequest(request);
  if (!owner) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return notFound();
  const row = await getOwnedSpool(id, owner.id);
  if (!row) return notFound();
  return Response.json({ spool: serializeSpool(row) });
}

// PATCH /api/v1/spools/:id — partial update of the input fields.
export async function PATCH(request: Request, { params }: RouteContext) {
  const owner = await authenticateApiRequest(request);
  if (!owner) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return notFound();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'invalid_json', 'Request body must be valid JSON');
  }
  const parsed = spoolBodySchema.partial().safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'invalid_input', firstIssueMessage(parsed.error));
  }
  if (Object.keys(parsed.data).length === 0) {
    return apiError(
      400,
      'invalid_input',
      'No updatable fields in request body'
    );
  }
  if (
    parsed.data.materialId !== undefined &&
    !(await isMaterialUsable(parsed.data.materialId, owner.id))
  ) {
    return apiError(400, 'invalid_input', 'Unknown or unavailable material');
  }
  if (
    parsed.data.spoolTypeId !== undefined &&
    !(await isSpoolTypeUsable(parsed.data.spoolTypeId, owner.id))
  ) {
    return apiError(400, 'invalid_input', 'Unknown or unavailable spool type');
  }

  const [before] = await db
    .select({ grams: spools.measuredTotalWeightGrams })
    .from(spools)
    .where(and(eq(spools.id, id), eq(spools.userId, owner.id)));
  if (!before) return notFound();

  let result: { id: string }[];
  try {
    result = await db
      .update(spools)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(spools.id, id), eq(spools.userId, owner.id), notLentOut()))
      .returning({ id: spools.id });
  } catch (error) {
    if (isTagConflict(error)) return tagConflict();
    throw error;
  }
  // The owner check passed above, so no row means an active lend.
  if (result.length === 0) return lentOut();
  const grams = parsed.data.measuredTotalWeightGrams;
  if (grams !== undefined && grams !== before.grams)
    await recordWeighing(id, grams, owner.id);

  revalidatePath('/');
  await emitSpoolChange(owner.id);
  const row = await getOwnedSpool(id, owner.id);
  return Response.json({ spool: serializeSpool(row!) });
}

// DELETE /api/v1/spools/:id
export async function DELETE(request: Request, { params }: RouteContext) {
  const owner = await authenticateApiRequest(request);
  if (!owner) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return notFound();
  const deleted = await db
    .delete(spools)
    .where(and(eq(spools.id, id), eq(spools.userId, owner.id), notLentOut()))
    .returning({ id: spools.id });
  if (deleted.length === 0)
    return (await getOwnedSpool(id, owner.id)) && (await isLentOut(id))
      ? lentOut()
      : notFound();
  revalidatePath('/');
  await emitSpoolChange(owner.id);
  return new Response(null, { status: 204 });
}
