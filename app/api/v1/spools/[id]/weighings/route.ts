import { apiError, authenticateApiRequest, unauthorized } from '@/lib/api-auth';
import { getWeighings } from '@/lib/weighings';
import { getOwnedSpool, parseId } from '../../shared';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/v1/spools/:id/weighings — the spool's weighing history, newest
// first (?limit=1..500, default 100).
export async function GET(request: Request, { params }: RouteContext) {
  const owner = await authenticateApiRequest(request);
  if (!owner) return unauthorized();
  const id = parseId((await params).id);
  if (!id || !(await getOwnedSpool(id, owner.id)))
    return apiError(404, 'not_found', 'Spool not found');

  const raw = new URL(request.url).searchParams.get('limit');
  const limit = raw === null ? 100 : Number.parseInt(raw, 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500)
    return apiError(400, 'invalid_input', 'limit must be between 1 and 500');

  const rows = await getWeighings(id, limit);
  return Response.json({
    weighings: rows.map((w) => ({
      measuredTotalWeightGrams: w.grams,
      measuredAt: w.measuredAt.toISOString(),
    })),
  });
}
