import 'server-only';

import { and, eq } from 'drizzle-orm';
import { apiError } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { isUniqueViolation } from '@/lib/db/errors';
import {
  materials,
  spools,
  spoolTypes,
  type Material,
  type Spool,
  type SpoolType,
} from '@/lib/db/schema';
import { toSpoolView } from '@/lib/filament';

// Helpers shared by the /api/v1/spools route handlers.

export type SpoolRow = {
  spool: Spool;
  material: Material;
  spoolType: SpoolType;
};

// Flat JSON view of a spool: computed amounts + its material's descriptive
// fields + the tag id, for external clients.
export function serializeSpool({ spool, material, spoolType }: SpoolRow) {
  const view = toSpoolView(spool, spoolType, material.filamentType);
  return {
    id: spool.id,
    tagUid: spool.tagUid,
    materialId: material.id,
    material: {
      manufacturer: material.manufacturer,
      name: material.name,
      filamentType: material.filamentType,
      color: material.color,
    },
    spoolTypeId: spoolType.id,
    spoolTypeLabel: view.spoolTypeLabel,
    emptyWeightGrams: view.emptyWeightGrams,
    fullFilamentWeightGrams: view.fullFilamentWeightGrams,
    measuredTotalWeightGrams: view.measuredTotalWeightGrams,
    filamentLeftGrams: view.filamentLeftGrams,
    percentLeft: view.percentLeft,
    isEmpty: view.isEmpty,
    isLow: view.isLow,
    pricePaidCents: spool.pricePaidCents,
    purchasedAt: spool.purchasedAt,
    location: spool.location,
    lastDriedAt: spool.lastDriedAt?.toISOString() ?? null,
    needsDrying: view.needsDrying,
    createdAt: spool.createdAt.toISOString(),
    updatedAt: spool.updatedAt.toISOString(),
  };
}

const spoolJoin = () =>
  db
    .select({ spool: spools, material: materials, spoolType: spoolTypes })
    .from(spools)
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .innerJoin(spoolTypes, eq(spools.spoolTypeId, spoolTypes.id));

export async function getOwnedSpool(
  id: string,
  userId: string
): Promise<SpoolRow | null> {
  const [row] = await spoolJoin().where(
    and(eq(spools.id, id), eq(spools.userId, userId))
  );
  return row ?? null;
}

export async function listOwnedSpools(userId: string): Promise<SpoolRow[]> {
  return spoolJoin().where(eq(spools.userId, userId));
}

export async function getOwnedSpoolByTag(
  tagUid: string,
  userId: string
): Promise<SpoolRow | null> {
  const [row] = await spoolJoin().where(
    and(eq(spools.tagUid, tagUid), eq(spools.userId, userId))
  );
  return row ?? null;
}

// Ids are UUIDs (opaque strings). Accept any non-empty, reasonably-sized token
// (avoids unbounded input); existence is checked by the ownership-scoped query.
export function parseId(raw: string): string | null {
  const id = raw.trim();
  return id.length > 0 && id.length <= 64 ? id : null;
}

// tagUid is unique per user (index filaments_user_id_tag_uid_unique) so the
// weigh endpoint always resolves a tag to exactly one spool. Writes that would
// duplicate a tag fail in SQL and are answered with 409.
export function isTagConflict(error: unknown): boolean {
  return isUniqueViolation(error, 'filaments_user_id_tag_uid_unique');
}

export function tagConflict(): Response {
  return apiError(
    409,
    'tag_conflict',
    'Another of your spools already has this tagUid'
  );
}
