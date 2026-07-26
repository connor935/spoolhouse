'use server';

import { spoolTypes, spools, type SpoolType } from '@/lib/db/schema';
import { createCatalogActions } from '@/lib/catalog';
import { parseOrThrow, spoolTypeSchema } from '@/lib/schemas';

type SpoolTypeInput = {
  manufacturer: string;
  name: string;
  emptyWeightGrams: number;
};

function validateSpoolTypeInput(input: SpoolTypeInput) {
  return parseOrThrow(spoolTypeSchema, input);
}

export type SpoolTypeWithUsage = SpoolType & { spoolCount: number };

const actions = createCatalogActions<SpoolType, SpoolTypeInput>({
  table: spoolTypes,
  spoolFkColumn: spools.spoolTypeId,
  revalidatePaths: ['/spool-types', '/admin/spool-types'],
  validate: validateSpoolTypeInput,
  notFoundMessage: 'Spool type not found',
  notAuthorizedMessage: 'Not authorized to edit this spool type',
  inUseMessage: 'Spool type is in use by existing spools',
});

// Spool types the current user may attach to a filament:
// all approved ones, plus their own pending submissions (Q3: usable immediately).
export async function getUsableSpoolTypes() {
  return actions.getUsable();
}

// Catalog view: approved for everyone + the user's own non-approved submissions.
export async function getSpoolTypeCatalog() {
  return actions.getUsable();
}

// Any user can request a new spool type; it lands as `pending` and is
// immediately usable by the submitter. Admins skip the review queue — their
// submissions are auto-approved (self-reviewed) and instantly global.
// Inspect the returned row's `status` for the outcome.
export async function requestSpoolType(
  input: SpoolTypeInput
): Promise<SpoolType> {
  return actions.request(input);
}

// --- Admin review ---

export async function getPendingSpoolTypes() {
  return actions.getPending();
}

export async function approveSpoolType(id: string, edits?: SpoolTypeInput) {
  return actions.approve(id, edits);
}

export async function rejectSpoolType(id: string) {
  return actions.reject(id);
}

// --- Edit & delete (I.3) ---

// Full catalog for the admin management list, incl. how many spools
// reference each spool type (governs whether it can be deleted).
export async function getAllSpoolTypesForAdmin(): Promise<
  SpoolTypeWithUsage[]
> {
  return actions.getAllForAdmin();
}

// Admin can edit any spool type, anytime, without changing its status.
// The submitter can edit their own spool type while it's pending or rejected
// (never once approved — it's global and others may reference it); editing
// a rejected entry resubmits it as pending for re-review.
export async function updateSpoolType(id: string, input: SpoolTypeInput) {
  return actions.update(id, input);
}

// Admin-only, and only when no spool references it (no data migration on
// delete — see the DB-setup notes: FK enforcement is off, so this check is
// the only thing preventing dangling spool.spoolTypeId references).
export async function deleteSpoolType(id: string) {
  return actions.remove(id);
}
