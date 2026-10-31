import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { spools } from '@/lib/db/schema';
import { apiError, authenticateApiRequest, unauthorized } from '@/lib/api-auth';
import { emitSpoolChange } from '@/lib/events';
import { recordWeighing } from '@/lib/weighings';
import { firstIssueMessage, measuredWeightSchema } from '@/lib/schemas';
import { getOwnedSpool, parseId, serializeSpool } from '../../shared';

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/v1/spools/:id/weight — re-weigh by id: store the measured total
// weight from the scale (g). Filament left is derived from this minus the
// spool type's empty weight.
export async function PUT(request: Request, { params }: RouteContext) {
  const owner = await authenticateApiRequest(request);
  if (!owner) return unauthorized();
  const id = parseId((await params).id);
  if (!id) return apiError(404, 'not_found', 'Spool not found');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'invalid_json', 'Request body must be valid JSON');
  }
  const parsed = measuredWeightSchema.safeParse(
    (body as Record<string, unknown> | null)?.measuredTotalWeightGrams
  );
  if (!parsed.success) {
    return apiError(400, 'invalid_input', firstIssueMessage(parsed.error));
  }
  const grams = parsed.data;

  const result = await db
    .update(spools)
    .set({ measuredTotalWeightGrams: grams, updatedAt: new Date() })
    .where(and(eq(spools.id, id), eq(spools.userId, owner.id)))
    .returning({ id: spools.id });
  if (result.length === 0) return apiError(404, 'not_found', 'Spool not found');
  await recordWeighing(id, grams, owner.id);

  revalidatePath('/');
  await emitSpoolChange(owner.id);
  const row = await getOwnedSpool(id, owner.id);
  return Response.json({ spool: serializeSpool(row!) });
}
