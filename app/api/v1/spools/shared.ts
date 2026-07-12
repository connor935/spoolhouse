import 'server-only';

import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
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
  const view = toSpoolView(spool, spoolType);
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
  id: number,
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

export function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export type SpoolBody = {
  materialId: number;
  spoolTypeId: number;
  fullFilamentWeightGrams: number;
  measuredTotalWeightGrams: number;
  tagUid: string | null;
};

type ParseResult =
  { ok: true; value: Partial<SpoolBody> } | { ok: false; message: string };

// Validate a create/patch body. `partial` (PATCH) accepts any subset; create
// requires materialId, spoolTypeId and both weights. Weights round to integers.
export function parseSpoolBody(
  body: unknown,
  { partial }: { partial: boolean }
): ParseResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, message: 'Request body must be a JSON object' };
  }
  const input = body as Record<string, unknown>;
  const value: Partial<SpoolBody> = {};

  for (const field of ['materialId', 'spoolTypeId'] as const) {
    if (input[field] !== undefined) {
      const v = input[field];
      if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0) {
        return { ok: false, message: `${field} must be a positive integer` };
      }
      value[field] = v;
    } else if (!partial) {
      return { ok: false, message: `${field} is required` };
    }
  }

  const full = parseWeight(input, 'fullFilamentWeightGrams', 1, partial, value);
  if (full) return full;
  const measured = parseWeight(
    input,
    'measuredTotalWeightGrams',
    0,
    partial,
    value
  );
  if (measured) return measured;

  if (input.tagUid !== undefined) {
    if (input.tagUid !== null && typeof input.tagUid !== 'string') {
      return { ok: false, message: 'tagUid must be a string or null' };
    }
    value.tagUid =
      typeof input.tagUid === 'string' && input.tagUid.trim()
        ? input.tagUid.trim()
        : null;
  }

  return { ok: true, value };
}

function parseWeight(
  input: Record<string, unknown>,
  field: 'fullFilamentWeightGrams' | 'measuredTotalWeightGrams',
  min: number,
  partial: boolean,
  out: Partial<SpoolBody>
): ParseResult | null {
  if (input[field] !== undefined) {
    const v = input[field];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      return { ok: false, message: `${field} must be a number (grams)` };
    }
    const grams = Math.round(v);
    if (grams < min)
      return { ok: false, message: `${field} must be at least ${min} g` };
    out[field] = grams;
  } else if (!partial) {
    return { ok: false, message: `${field} is required` };
  }
  return null;
}
