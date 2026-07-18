import { asc, eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { materials } from '@/lib/db/schema';
import { authenticateApiRequest, unauthorized } from '@/lib/api-auth';

// GET /api/v1/materials — materials the token owner may attach spools to:
// all approved ones plus their own pending submissions.
export async function GET(request: Request) {
  const owner = await authenticateApiRequest(request);
  if (!owner) return unauthorized();
  const rows = await db
    .select()
    .from(materials)
    .where(
      or(
        eq(materials.status, 'approved'),
        eq(materials.submittedById, owner.id)
      )
    )
    .orderBy(asc(materials.manufacturer), asc(materials.name));
  return Response.json({
    materials: rows.map((m) => ({
      id: m.id,
      manufacturer: m.manufacturer,
      name: m.name,
      filamentType: m.filamentType,
      color: m.color,
      status: m.status,
    })),
  });
}
