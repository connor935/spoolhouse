import { and, eq, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { materials, spools, spoolTypes } from '@/lib/db/schema';
import {
  apiError,
  authenticateApiRequest,
  unauthorized,
  type ApiUser,
} from '@/lib/api-auth';
import { emitSpoolChange } from '@/lib/events';
import { getOwnedSpool, getOwnedSpoolByTag, serializeSpool } from '../shared';

// Register-or-refresh a spool by its NFC tag id — the endpoint a scale/reader
// calls. If a spool with this tagUid already exists for the token owner, its
// weight is refreshed; otherwise a new spool is registered (creating the
// material and spool type on the fly from the tag data if needed).
export async function POST(request: Request) {
  const owner = await authenticateApiRequest(request);
  if (!owner) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'invalid_json', 'Request body must be valid JSON');
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const tagUid = typeof b.tagUid === 'string' ? b.tagUid.trim() : '';
  if (!tagUid) return apiError(400, 'invalid_input', 'tagUid is required');
  if (
    typeof b.measuredTotalWeightGrams !== 'number' ||
    !Number.isFinite(b.measuredTotalWeightGrams) ||
    Math.round(b.measuredTotalWeightGrams) < 0
  ) {
    return apiError(
      400,
      'invalid_input',
      'measuredTotalWeightGrams must be a number ≥ 0 (grams)'
    );
  }
  const measured = Math.round(b.measuredTotalWeightGrams);

  // Refresh path: tag already registered for this user
  const existing = await getOwnedSpoolByTag(tagUid, owner.id);
  if (existing) {
    await db
      .update(spools)
      .set({ measuredTotalWeightGrams: measured, updatedAt: new Date() })
      .where(
        and(eq(spools.id, existing.spool.id), eq(spools.userId, owner.id))
      );
    revalidatePath('/');
    await emitSpoolChange(owner.id);
    const row = await getOwnedSpool(existing.spool.id, owner.id);
    return Response.json({ action: 'refreshed', spool: serializeSpool(row!) });
  }

  // Register path: need enough to create/find a material
  const manufacturer = str(b.manufacturer);
  const name = str(b.name);
  const filamentType = str(b.filamentType) || 'Other';
  if (!manufacturer || !name) {
    return apiError(
      400,
      'not_registered',
      'No spool for this tag. To register, include at least manufacturer and name.'
    );
  }
  const color = str(b.color) || null;
  const emptyWeightGrams = intOr(b.emptyWeightGrams, 0);
  const fullFilamentWeightGrams = intOr(b.fullFilamentWeightGrams, measured);

  const materialId = await findOrCreateMaterial(owner, {
    manufacturer,
    name,
    filamentType,
    color,
  });
  const spoolTypeId = await findOrCreateSpoolType(owner, {
    manufacturer,
    name: `${manufacturer} spool`,
    emptyWeightGrams,
  });

  const [created] = await db
    .insert(spools)
    .values({
      userId: owner.id,
      materialId,
      spoolTypeId,
      fullFilamentWeightGrams: Math.max(1, fullFilamentWeightGrams),
      measuredTotalWeightGrams: measured,
      tagUid,
    })
    .returning();
  revalidatePath('/');
  await emitSpoolChange(owner.id);
  const row = await getOwnedSpool(created.id, owner.id);
  return Response.json(
    { action: 'registered', spool: serializeSpool(row!) },
    { status: 201 }
  );
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}
function intOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
}

async function findOrCreateMaterial(
  owner: ApiUser,
  m: {
    manufacturer: string;
    name: string;
    filamentType: string;
    color: string | null;
  }
): Promise<number> {
  // A material's identity includes its colour (e.g. "Galaxy Black"), so a
  // different colour of the same product is a different material — match on
  // colour too (NULL-safe) rather than lumping all colours together.
  const [found] = await db
    .select({ id: materials.id })
    .from(materials)
    .where(
      and(
        or(
          eq(materials.status, 'approved'),
          eq(materials.submittedById, owner.id)
        ),
        eq(materials.manufacturer, m.manufacturer),
        eq(materials.name, m.name),
        m.color === null
          ? isNull(materials.color)
          : eq(materials.color, m.color)
      )
    );
  if (found) return found.id;
  const [created] = await db
    .insert(materials)
    .values({ ...m, status: 'pending', submittedById: owner.id })
    .returning({ id: materials.id });
  return created.id;
}

async function findOrCreateSpoolType(
  owner: ApiUser,
  st: { manufacturer: string; name: string; emptyWeightGrams: number }
): Promise<number> {
  const [found] = await db
    .select({ id: spoolTypes.id })
    .from(spoolTypes)
    .where(
      and(
        or(
          eq(spoolTypes.status, 'approved'),
          eq(spoolTypes.submittedById, owner.id)
        ),
        eq(spoolTypes.manufacturer, st.manufacturer),
        eq(spoolTypes.emptyWeightGrams, st.emptyWeightGrams)
      )
    );
  if (found) return found.id;
  const [created] = await db
    .insert(spoolTypes)
    .values({ ...st, status: 'pending', submittedById: owner.id })
    .returning({ id: spoolTypes.id });
  return created.id;
}
