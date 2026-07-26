'use server';

import { materials, spools, type Material } from '@/lib/db/schema';
import { createCatalogActions } from '@/lib/catalog';
import { deleteMaterialPropertiesFor } from '@/lib/material-properties';
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
export async function getUsableMaterials() {
  return actions.getUsable();
}

export async function getMaterialCatalog() {
  return actions.getUsable();
}

// Any user can request a new material; it lands as `pending` and is
// immediately usable by the submitter. Admins skip the review queue — their
// submissions are auto-approved (self-reviewed) and instantly global.
// Inspect the returned row's `status` for the outcome.
export async function requestMaterial(
  input: MaterialInput
): Promise<Material> {
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
