import { desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { spools } from '@/lib/db/schema';
import { apiError, authenticateApiRequest, unauthorized } from '@/lib/api-auth';
import { emitSpoolChange } from '@/lib/events';
import { recordWeighing } from '@/lib/weighings';
import { isSpoolTypeUsable } from '@/lib/spool-type-usable';
import { isMaterialUsable } from '@/lib/material-usable';
import { firstIssueMessage, spoolBodySchema } from '@/lib/schemas';
import {
  getOwnedSpool,
  isTagConflict,
  listOwnedSpools,
  serializeSpool,
  tagConflict,
} from './shared';

// GET /api/v1/spools — the token owner's spools, newest first.
export async function GET(request: Request) {
  const owner = await authenticateApiRequest(request);
  if (!owner) return unauthorized();
  const rows = await listOwnedSpools(owner.id);
  rows.sort(
    (a, b) => b.spool.createdAt.getTime() - a.spool.createdAt.getTime()
  );
  return Response.json({ spools: rows.map(serializeSpool) });
}

// POST /api/v1/spools — create a spool from existing material + spool-type ids.
export async function POST(request: Request) {
  const owner = await authenticateApiRequest(request);
  if (!owner) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'invalid_json', 'Request body must be valid JSON');
  }
  const parsed = spoolBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'invalid_input', firstIssueMessage(parsed.error));
  }
  const input = parsed.data;

  if (!(await isMaterialUsable(input.materialId, owner.id))) {
    return apiError(400, 'invalid_input', 'Unknown or unavailable material');
  }
  if (!(await isSpoolTypeUsable(input.spoolTypeId, owner.id))) {
    return apiError(400, 'invalid_input', 'Unknown or unavailable spool type');
  }

  let created: typeof spools.$inferSelect;
  try {
    [created] = await db
      .insert(spools)
      .values({
        userId: owner.id,
        materialId: input.materialId,
        spoolTypeId: input.spoolTypeId,
        fullFilamentWeightGrams: input.fullFilamentWeightGrams,
        measuredTotalWeightGrams: input.measuredTotalWeightGrams,
        tagUid: input.tagUid ?? null,
        pricePaidCents: input.pricePaidCents,
        purchasedAt: input.purchasedAt,
        location: input.location,
        lastDriedAt: input.lastDriedAt,
      })
      .returning();
  } catch (error) {
    if (isTagConflict(error)) return tagConflict();
    throw error;
  }
  await recordWeighing(created.id, created.measuredTotalWeightGrams, owner.id);
  revalidatePath('/');
  await emitSpoolChange(owner.id);
  const row = await getOwnedSpool(created.id, owner.id);
  return Response.json({ spool: serializeSpool(row!) }, { status: 201 });
}
