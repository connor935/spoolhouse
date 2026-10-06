import 'server-only';

import {
  and,
  eq,
  exists,
  gte,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '@/lib/db';
import { materialProperties, materials } from '@/lib/db/schema';
import {
  constraintActive,
  type PropertyConstraint,
} from '@/lib/property-filter';
import { searchTokens } from '@/lib/search';

// The material catalog runs to tens of thousands of rows once SpoolmanDB
// manufacturers are imported, so searching happens in SQL and only a page of
// results is ever sent to the browser. This builds the WHERE clause shared by
// the spool-form picker, both catalog pages and the REST API.

export type MaterialQuery = {
  q?: string;
  manufacturer?: string | null;
  filamentType?: string | null;
  constraints?: PropertyConstraint[];
  // Catalog/admin only: exact review status. Undefined = no status restriction
  // beyond `visibleTo`.
  status?: string | null;
  // Restricts to what this user may attach spools to (approved + their own
  // pending). Omit for admin views, which see every row.
  visibleTo?: string;
};

// Every query token must appear somewhere in manufacturer + name + type, so
// "polymaker petg red" matches across three columns. Mirrors matchesTokens()
// in lib/search.ts, which still does the same job client-side for the
// dashboard's already-loaded inventory.
// The concatenation is served by the trigram index materials_search_trgm_idx
// (drizzle/0008) — keep it byte-for-byte in step with that index expression,
// or the planner falls back to a sequential scan.
function tokenCondition(q: string): SQL | undefined {
  const tokens = searchTokens(q.trim());
  if (tokens.length === 0) return undefined;
  return and(
    ...tokens.map(
      (t) =>
        sql`(${materials.manufacturer} || ' ' || ${materials.name} || ' ' || ${materials.filamentType}) ILIKE ${'%' + t + '%'}`
    )
  );
}

// A material matches a range constraint when it HAS a value for that property
// whose numeric span overlaps [min, max] — the SQL twin of overlaps() in
// lib/property-filter.ts, reading the value_min/value_max columns derived on
// write. Materials without a value for the property are excluded, matching
// materialMatchesConstraints().
function constraintCondition(c: PropertyConstraint): SQL | undefined {
  const bounds = [
    eq(materialProperties.propertyId, c.propertyId),
    eq(materialProperties.materialId, materials.id),
    c.min === null ? undefined : gte(materialProperties.valueMax, c.min),
    c.max === null ? undefined : lte(materialProperties.valueMin, c.max),
  ].filter(Boolean) as SQL[];
  return exists(
    db
      .select({ one: sql`1` })
      .from(materialProperties)
      .where(and(...bounds))
  );
}

export function materialWhere(query: MaterialQuery): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];

  if (query.q) conditions.push(tokenCondition(query.q));
  if (query.manufacturer)
    conditions.push(eq(materials.manufacturer, query.manufacturer));
  if (query.filamentType)
    conditions.push(eq(materials.filamentType, query.filamentType));
  if (query.status) conditions.push(eq(materials.status, query.status));
  if (query.visibleTo)
    conditions.push(
      or(
        eq(materials.status, 'approved'),
        eq(materials.submittedById, query.visibleTo)
      )
    );
  for (const c of query.constraints ?? []) {
    if (constraintActive(c)) conditions.push(constraintCondition(c));
  }

  const present = conditions.filter(Boolean) as SQL[];
  return present.length === 0 ? undefined : and(...present);
}
