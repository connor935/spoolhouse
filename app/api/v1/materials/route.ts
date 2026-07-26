import { asc, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { materials } from '@/lib/db/schema';
import { authenticateApiRequest, unauthorized } from '@/lib/api-auth';
import { getPropertiesForMaterials } from '@/lib/material-properties';
import { materialWhere } from '@/lib/material-search';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// GET /api/v1/materials — materials the token owner may attach spools to:
// all approved ones plus their own pending submissions. Each includes its
// read-only datasheet `properties` (see /admin/properties).
//
// Paginated: the catalog reaches tens of thousands of rows once SpoolmanDB
// manufacturers are imported, so clients narrow with `q` and page with
// `limit`/`offset` instead of pulling everything.
export async function GET(request: Request) {
  const owner = await authenticateApiRequest(request);
  if (!owner) return unauthorized();

  const params = new URL(request.url).searchParams;
  const q = params.get('q') ?? undefined;
  const parsedLimit = Number.parseInt(params.get('limit') ?? '', 10);
  const parsedOffset = Number.parseInt(params.get('offset') ?? '', 10);
  const limit = Number.isNaN(parsedLimit)
    ? DEFAULT_LIMIT
    : Math.min(Math.max(parsedLimit, 1), MAX_LIMIT);
  const offset = Number.isNaN(parsedOffset) ? 0 : Math.max(parsedOffset, 0);

  const where = materialWhere({ q, visibleTo: owner.id });
  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(materials)
      .where(where)
      .orderBy(
        asc(materials.manufacturer),
        asc(materials.name),
        asc(materials.id)
      )
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(materials).where(where),
  ]);

  const propsByMaterial = await getPropertiesForMaterials(
    rows.map((m) => m.id)
  );
  return Response.json({
    materials: rows.map((m) => ({
      id: m.id,
      manufacturer: m.manufacturer,
      name: m.name,
      filamentType: m.filamentType,
      color: m.color,
      status: m.status,
      properties: (propsByMaterial[m.id] ?? []).map((p) => ({
        key: p.key,
        name: p.name,
        unit: p.unit,
        value: p.value,
        verified: p.verified,
      })),
    })),
    total,
    limit,
    offset,
  });
}
