'use server';

import { db } from '@/lib/db';
import { spoolTypes, spools, type SpoolType } from '@/lib/db/schema';
import { requireAdmin, requireUser } from '@/lib/auth-session';
import { and, asc, count, eq, ne, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Spool types the current user may attach to a filament:
// all approved ones, plus their own pending submissions (Q3: usable immediately).
export async function getUsableSpoolTypes() {
  const user = await requireUser();
  return db
    .select()
    .from(spoolTypes)
    .where(
      or(
        eq(spoolTypes.status, 'approved'),
        eq(spoolTypes.submittedById, user.id)
      )
    )
    .orderBy(asc(spoolTypes.manufacturer), asc(spoolTypes.name));
}

// Catalog view: approved for everyone + the user's own non-approved submissions.
export async function getSpoolTypeCatalog() {
  return getUsableSpoolTypes();
}

type SpoolTypeInput = {
  manufacturer: string;
  name: string;
  emptyWeightGrams: number;
};

function validateSpoolTypeInput(input: SpoolTypeInput) {
  const manufacturer = input.manufacturer.trim();
  const name = input.name.trim();
  const emptyWeightGrams = Math.round(input.emptyWeightGrams);
  if (!manufacturer || !name)
    throw new Error('Manufacturer and name are required');
  if (!Number.isFinite(emptyWeightGrams) || emptyWeightGrams <= 0) {
    throw new Error('Empty spool weight must be greater than 0 g');
  }
  return { manufacturer, name, emptyWeightGrams };
}

// Any user can request a new spool type; it lands as `pending` and is
// immediately usable by the submitter. Admins skip the review queue — their
// submissions are auto-approved (self-reviewed) and instantly global.
// Inspect the returned row's `status` for the outcome.
export async function requestSpoolType(
  input: SpoolTypeInput
): Promise<SpoolType> {
  const user = await requireUser();
  const values = validateSpoolTypeInput(input);
  const isAdmin = user.role === 'admin';
  const [created] = await db
    .insert(spoolTypes)
    .values({
      ...values,
      status: isAdmin ? 'approved' : 'pending',
      submittedById: user.id,
      reviewedById: isAdmin ? user.id : undefined,
    })
    .returning();
  revalidatePath('/spool-types');
  revalidatePath('/admin/spool-types');
  return created;
}

// --- Admin review ---

export async function getPendingSpoolTypes() {
  await requireAdmin();
  return db
    .select()
    .from(spoolTypes)
    .where(eq(spoolTypes.status, 'pending'))
    .orderBy(asc(spoolTypes.createdAt));
}

export async function approveSpoolType(id: string, edits?: SpoolTypeInput) {
  const admin = await requireAdmin();
  const fields = edits ? validateSpoolTypeInput(edits) : {};
  await db
    .update(spoolTypes)
    .set({
      ...fields,
      status: 'approved',
      reviewedById: admin.id,
      updatedAt: new Date(),
    })
    .where(and(eq(spoolTypes.id, id), ne(spoolTypes.status, 'approved')));
  revalidatePath('/spool-types');
  revalidatePath('/admin/spool-types');
}

export async function rejectSpoolType(id: string) {
  const admin = await requireAdmin();
  await db
    .update(spoolTypes)
    .set({ status: 'rejected', reviewedById: admin.id, updatedAt: new Date() })
    .where(and(eq(spoolTypes.id, id), ne(spoolTypes.status, 'approved')));
  revalidatePath('/spool-types');
  revalidatePath('/admin/spool-types');
}

// --- Edit & delete (I.3) ---

export type SpoolTypeWithUsage = SpoolType & { spoolCount: number };

// Full catalog for the admin management list, incl. how many spools
// reference each spool type (governs whether it can be deleted).
export async function getAllSpoolTypesForAdmin(): Promise<
  SpoolTypeWithUsage[]
> {
  await requireAdmin();
  const rows = await db
    .select({ spoolType: spoolTypes, spoolCount: count(spools.id) })
    .from(spoolTypes)
    .leftJoin(spools, eq(spools.spoolTypeId, spoolTypes.id))
    .groupBy(spoolTypes.id)
    .orderBy(asc(spoolTypes.manufacturer), asc(spoolTypes.name));
  return rows.map((r) => ({ ...r.spoolType, spoolCount: r.spoolCount }));
}

// Admin can edit any spool type, anytime, without changing its status.
// The submitter can edit their own spool type while it's pending or rejected
// (never once approved — it's global and others may reference it); editing
// a rejected entry resubmits it as pending for re-review.
export async function updateSpoolType(id: string, input: SpoolTypeInput) {
  const user = await requireUser();
  const [existing] = await db
    .select()
    .from(spoolTypes)
    .where(eq(spoolTypes.id, id));
  if (!existing) throw new Error('Spool type not found');

  const isAdmin = user.role === 'admin';
  const isOwnEditable =
    existing.submittedById === user.id && existing.status !== 'approved';
  if (!isAdmin && !isOwnEditable)
    throw new Error('Not authorized to edit this spool type');

  const values = validateSpoolTypeInput(input);
  await db
    .update(spoolTypes)
    .set({
      ...values,
      status: isAdmin ? existing.status : 'pending',
      updatedAt: new Date(),
    })
    .where(eq(spoolTypes.id, id));
  revalidatePath('/spool-types');
  revalidatePath('/admin/spool-types');
}

// Admin-only, and only when no spool references it (no data migration on
// delete — see the DB-setup notes: FK enforcement is off, so this check is
// the only thing preventing dangling spool.spoolTypeId references).
export async function deleteSpoolType(id: string) {
  await requireAdmin();
  const [usage] = await db
    .select({ count: count() })
    .from(spools)
    .where(eq(spools.spoolTypeId, id));
  if (usage.count > 0)
    throw new Error('Spool type is in use by existing spools');
  await db.delete(spoolTypes).where(eq(spoolTypes.id, id));
  revalidatePath('/spool-types');
  revalidatePath('/admin/spool-types');
}
