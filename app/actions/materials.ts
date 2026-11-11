'use server';

import { and, asc, count, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { materials, spools, user, type Material } from '@/lib/db/schema';
import { requireAdmin, requireUser } from '@/lib/auth-session';
import { createCatalogActions } from '@/lib/catalog';
import {
  countByStatus,
  pendingFirst,
  type CatalogStatusCounts,
} from '@/lib/catalog-status';
import { deleteMaterialPropertiesFor } from '@/lib/material-properties';
import { materialWhere } from '@/lib/material-search';
import type { PropertyConstraint } from '@/lib/property-filter';
import {
  adminMaterialQuerySchema,
  materialCatalogQuerySchema,
  materialSchema,
  parseOrThrow,
} from '@/lib/schemas';

type MaterialInput = {
  manufacturer: string;
  name: string;
  filamentType: string;
  color?: string | null;
};

function validateMaterialInput(input: MaterialInput) {
  return parseOrThrow(materialSchema, input);
}

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
  filamentTypes?: string[];
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

export type AdminMaterialRow = {
  material: Material;
  /** null for imported rows. */
  submitterName: string | null;
  /** Spools on it across all users — governs whether it can be deleted. */
  spoolCount: number;
};

// Admin twin for /admin/materials: every row regardless of submitter, pending
// first (the review backlog leads the table), with the submitter's name, the
// spool count behind the delete guard, and the status counts the filter shows.
export async function searchMaterialsForAdmin(rawInput: unknown): Promise<{
  rows: AdminMaterialRow[];
  total: number;
  grandTotal: number;
  statusCounts: CatalogStatusCounts;
}> {
  await requireAdmin();
  const input = parseOrThrow(adminMaterialQuerySchema, rawInput);
  const where = materialWhere(input);
  const [rows, [{ value: total }], byStatus] = await Promise.all([
    db
      .select({
        material: materials,
        submitterName: user.name,
        spoolCount: count(spools.id),
      })
      .from(materials)
      .leftJoin(spools, eq(spools.materialId, materials.id))
      .leftJoin(user, eq(materials.submittedById, user.id))
      .where(where)
      .groupBy(materials.id, user.name)
      .orderBy(
        pendingFirst(materials.status),
        asc(materials.manufacturer),
        asc(materials.name),
        asc(materials.id)
      )
      .limit(input.limit)
      .offset(input.offset),
    db.select({ value: count() }).from(materials).where(where),
    db
      .select({ status: materials.status, value: count() })
      .from(materials)
      .groupBy(materials.status),
  ]);
  const statusCounts = countByStatus(byStatus);
  return {
    rows,
    total,
    grandTotal:
      statusCounts.approved + statusCounts.pending + statusCounts.rejected,
    statusCounts,
  };
}

export type MaterialCatalogEntry = {
  material: Material;
  /** The viewer's spools of it ("In your stock · 3"). */
  stockCount: number;
};

// One page of the /materials catalog, with the viewer's stock count for just
// those rows. Also the "Load more" call, so the first page and later ones
// share one shape.
export async function searchMaterialCatalog(rawInput: unknown = {}): Promise<{
  entries: MaterialCatalogEntry[];
  total: number;
  /** Matches per manufacturer on this page, for the group headers. */
  manufacturerTotals: Record<string, number>;
}> {
  const user = await requireUser();
  const input = parseOrThrow(materialCatalogQuerySchema, rawInput);
  const query = { ...input, visibleTo: user.id };
  const { materials: rows, total } = await runMaterialSearch(query);
  if (rows.length === 0) return { entries: [], total, manufacturerTotals: {} };

  const manufacturers = [...new Set(rows.map((m) => m.manufacturer))];
  const [counts, totals] = await Promise.all([
    db
      .select({ materialId: spools.materialId, value: count() })
      .from(spools)
      .where(
        and(
          eq(spools.userId, user.id),
          inArray(
            spools.materialId,
            rows.map((m) => m.id)
          )
        )
      )
      .groupBy(spools.materialId),
    db
      .select({ manufacturer: materials.manufacturer, value: count() })
      .from(materials)
      .where(
        and(
          materialWhere(query),
          inArray(materials.manufacturer, manufacturers)
        )
      )
      .groupBy(materials.manufacturer),
  ]);
  const byId = new Map(counts.map((c) => [c.materialId, c.value]));
  return {
    entries: rows.map((material) => ({
      material,
      stockCount: byId.get(material.id) ?? 0,
    })),
    total,
    manufacturerTotals: Object.fromEntries(
      totals.map((t) => [t.manufacturer, t.value])
    ),
  };
}

// Colours of the viewer's most recently added spools' materials, offered as
// one-click swatches in the request form.
export async function getRecentMaterialColors(limit = 4): Promise<string[]> {
  const user = await requireUser();
  const rows = await db
    .select({ color: materials.color, createdAt: spools.createdAt })
    .from(spools)
    .innerJoin(materials, eq(spools.materialId, materials.id))
    .where(and(eq(spools.userId, user.id), isNotNull(materials.color)))
    .orderBy(desc(spools.createdAt))
    .limit(50);
  const colors = [...new Set(rows.map((r) => r.color!.toUpperCase()))];
  return colors.slice(0, limit);
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
