'use server';

import { asc, count, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { materials, spools, type Material } from '@/lib/db/schema';
import { requireAdmin, requireUser } from '@/lib/auth-session';
import { createCatalogActions } from '@/lib/catalog';
import { deleteMaterialPropertiesFor } from '@/lib/material-properties';
import { materialWhere } from '@/lib/material-search';
import type { PropertyConstraint } from '@/lib/property-filter';
import { materialSchema, parseOrThrow } from '@/lib/schemas';

type MaterialInput = {
  manufacturer: string;
  name: string;
  filamentType: string;
  color?: string | null;
};

function validateMaterialInput(input: MaterialInput) {
  return parseOrThrow(materialSchema, input);
}

export type MaterialWithUsage = Material & { spoolCount: number };

const actions = createCatalogActions<Material, MaterialInput>({
  table: materials,
  spoolFkColumn: spools.materialId,
  revalidatePaths: ['/materials', '/admin/materials'],
  validate: validateMaterialInput,
  notFoundMessage: 'Material not found',
  notAuthorizedMessage: 'Not authorized to edit this material',
  inUseMessage: 'Material is in use by existing spools',
  onRemove: deleteMaterialPropertiesFor,
});

// Materials the current user may attach spools to: all approved ones, plus
// their own pending submissions (same rule as spool types).
//
// Prefer searchMaterials() for anything user-facing — the catalog runs to tens
// of thousands of rows after a SpoolmanDB import, and this returns all of them.
export async function getUsableMaterials() {
  return actions.getUsable();
}

export type MaterialSearchResult = {
  materials: Material[];
  // Matches before the limit was applied, so callers can say "showing 50 of N".
  total: number;
};

export type MaterialSearchInput = {
  q?: string;
  manufacturer?: string | null;
  filamentType?: string | null;
  constraints?: PropertyConstraint[];
  status?: string | null;
  limit?: number;
  offset?: number;
};

const MAX_SEARCH_LIMIT = 200;

// Searches the catalog in SQL and returns one page of results. Used by the
// spool-form picker (small limit, as-you-type) and /materials (page-sized).
export async function searchMaterials(
  input: MaterialSearchInput = {}
): Promise<MaterialSearchResult> {
  const user = await requireUser();
  return runMaterialSearch({ ...input, visibleTo: user.id });
}

// Admin twin: every row regardless of status/submitter, plus the spool count
// that governs whether a row can be deleted, and the counts the catalog header
// and "Review pending" shortcut need.
export async function searchMaterialsForAdmin(
  input: MaterialSearchInput = {}
): Promise<{
  materials: MaterialWithUsage[];
  total: number;
  grandTotal: number;
  pendingCount: number;
}> {
  await requireAdmin();
  const where = materialWhere(input);
  const limit = Math.min(input.limit ?? 150, MAX_SEARCH_LIMIT);
  const [
    rows,
    [{ value: total }],
    [{ value: grandTotal }],
    [{ value: pendingCount }],
  ] = await Promise.all([
    db
      .select({ material: materials, spoolCount: count(spools.id) })
      .from(materials)
      .leftJoin(spools, eq(spools.materialId, materials.id))
      .where(where)
      .groupBy(materials.id)
      .orderBy(
        asc(materials.manufacturer),
        asc(materials.name),
        asc(materials.id)
      )
      .limit(limit)
      .offset(input.offset ?? 0),
    db.select({ value: count() }).from(materials).where(where),
    db.select({ value: count() }).from(materials),
    db
      .select({ value: count() })
      .from(materials)
      .where(eq(materials.status, 'pending')),
  ]);
  return {
    materials: rows.map((r) => ({ ...r.material, spoolCount: r.spoolCount })),
    total,
    grandTotal,
    pendingCount,
  };
}

// Size of the catalog the current user can see, for the "x of y" readout.
export async function countUsableMaterials(): Promise<number> {
  const user = await requireUser();
  const [{ value }] = await db
    .select({ value: count() })
    .from(materials)
    .where(materialWhere({ visibleTo: user.id }));
  return value;
}

async function runMaterialSearch(
  input: MaterialSearchInput & { visibleTo: string }
): Promise<MaterialSearchResult> {
  const where = materialWhere(input);
  const limit = Math.min(input.limit ?? 50, MAX_SEARCH_LIMIT);
  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(materials)
      .where(where)
      // `id` breaks ties: 9 rows already share a (manufacturer, name) pair, and
      // without a total order LIMIT/OFFSET can skip or repeat one across pages.
      .orderBy(
        asc(materials.manufacturer),
        asc(materials.name),
        asc(materials.id)
      )
      .limit(limit)
      .offset(input.offset ?? 0),
    db.select({ value: count() }).from(materials).where(where),
  ]);
  return { materials: rows, total };
}

// Distinct manufacturers for the picker/catalog dropdowns — a few hundred
// strings instead of every row.
export async function getMaterialManufacturers(): Promise<string[]> {
  const user = await requireUser();
  const rows = await db
    .selectDistinct({ manufacturer: materials.manufacturer })
    .from(materials)
    .where(materialWhere({ visibleTo: user.id }))
    .orderBy(asc(materials.manufacturer));
  return rows.map((r) => r.manufacturer);
}

// Resolves specific materials by id, for hydrating a selection the search
// results no longer contain (editing a spool, presetting from a card).
export async function getMaterialsByIds(ids: string[]): Promise<Material[]> {
  await requireUser();
  if (ids.length === 0) return [];
  return db.select().from(materials).where(inArray(materials.id, ids));
}

// Any user can request a new material; it lands as `pending` and is
// immediately usable by the submitter. Admins skip the review queue — their
// submissions are auto-approved (self-reviewed) and instantly global.
// Inspect the returned row's `status` for the outcome.
export async function requestMaterial(input: MaterialInput): Promise<Material> {
  return actions.request(input);
}

// --- Admin review ---

export async function getPendingMaterials() {
  return actions.getPending();
}

export async function approveMaterial(id: string, edits?: MaterialInput) {
  return actions.approve(id, edits);
}

export async function rejectMaterial(id: string) {
  return actions.reject(id);
}

// --- Edit & delete (I.3) ---

// Full catalog for the admin management list, incl. how many spools
// reference each material (governs whether it can be deleted).
export async function getAllMaterialsForAdmin(): Promise<MaterialWithUsage[]> {
  return actions.getAllForAdmin();
}

// Admin can edit any material, anytime, without changing its status.
// The submitter can edit their own material while it's pending or rejected
// (never once approved — it's global and others may reference it); editing
// a rejected entry resubmits it as pending for re-review.
export async function updateMaterial(id: string, input: MaterialInput) {
  return actions.update(id, input);
}

// Admin-only, and only when no spool references it (no data migration on
// delete — see the DB-setup notes: FK enforcement is off, so this check is
// the only thing preventing dangling spool.materialId references).
export async function deleteMaterial(id: string) {
  return actions.remove(id);
}
