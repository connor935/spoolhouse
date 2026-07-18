import 'server-only';

import { db } from '@/lib/db';
import { spools } from '@/lib/db/schema';
import { requireAdmin, requireUser } from '@/lib/auth-session';
import { and, asc, count, eq, ne, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

// `materials` and `spoolTypes` are both global, admin-curated catalogs with
// an identical request→review→edit/delete shape (see CLAUDE.md "Materials &
// spool types"). This factory implements that shape once; each catalog's
// `'use server'` file (app/actions/materials.ts, app/actions/spool-types.ts)
// keeps thin async wrappers around it — required because a 'use server' file
// may only export async functions, not a returned object of them.
type CatalogRow = {
  id: string;
  status: string;
  submittedById: string | null;
};

type CatalogConfig<TInput> = {
  table: SQLiteTable & {
    id: SQLiteColumn;
    manufacturer: SQLiteColumn;
    name: SQLiteColumn;
    status: SQLiteColumn;
    submittedById: SQLiteColumn;
    reviewedById: SQLiteColumn;
    createdAt: SQLiteColumn;
    updatedAt: SQLiteColumn;
  };
  // The `spools` column referencing this catalog's rows (materialId / spoolTypeId).
  spoolFkColumn: SQLiteColumn;
  // [public catalog page, admin management page]
  revalidatePaths: readonly [string, string];
  validate: (input: TInput) => Record<string, unknown>;
  notFoundMessage: string;
  notAuthorizedMessage: string;
  inUseMessage: string;
};

export function createCatalogActions<TRow extends CatalogRow, TInput>(
  config: CatalogConfig<TInput>
) {
  const {
    table,
    spoolFkColumn,
    revalidatePaths,
    validate,
    notFoundMessage,
    notAuthorizedMessage,
    inUseMessage,
  } = config;

  function revalidateCatalog() {
    for (const path of revalidatePaths) revalidatePath(path);
  }

  // Usable by the current user: all approved rows, plus their own pending
  // submissions (a pending row is immediately usable by its submitter).
  async function getUsable(): Promise<TRow[]> {
    const user = await requireUser();
    return db
      .select()
      .from(table)
      .where(
        or(eq(table.status, 'approved'), eq(table.submittedById, user.id))
      )
      .orderBy(asc(table.manufacturer), asc(table.name)) as Promise<TRow[]>;
  }

  // Any user can submit; it lands as `pending` and is immediately usable by
  // the submitter. Admin submissions are auto-approved (self-reviewed).
  async function request(input: TInput): Promise<TRow> {
    const user = await requireUser();
    const values = validate(input);
    const isAdmin = user.role === 'admin';
    const [created] = await db
      .insert(table)
      .values({
        ...values,
        status: isAdmin ? 'approved' : 'pending',
        submittedById: user.id,
        reviewedById: isAdmin ? user.id : undefined,
      })
      .returning();
    revalidateCatalog();
    return created as TRow;
  }

  async function getPending(): Promise<TRow[]> {
    await requireAdmin();
    return db
      .select()
      .from(table)
      .where(eq(table.status, 'pending'))
      .orderBy(asc(table.createdAt)) as Promise<TRow[]>;
  }

  async function approve(id: string, edits?: TInput) {
    const admin = await requireAdmin();
    const fields = edits ? validate(edits) : {};
    await db
      .update(table)
      .set({
        ...fields,
        status: 'approved',
        reviewedById: admin.id,
        updatedAt: new Date(),
      })
      .where(and(eq(table.id, id), ne(table.status, 'approved')));
    revalidateCatalog();
  }

  async function reject(id: string) {
    const admin = await requireAdmin();
    await db
      .update(table)
      .set({ status: 'rejected', reviewedById: admin.id, updatedAt: new Date() })
      .where(and(eq(table.id, id), ne(table.status, 'approved')));
    revalidateCatalog();
  }

  // Full catalog for the admin management list, incl. how many spools
  // reference each row (governs whether it can be deleted).
  async function getAllForAdmin(): Promise<(TRow & { spoolCount: number })[]> {
    await requireAdmin();
    const rows = await db
      .select({ row: table, spoolCount: count(spools.id) })
      .from(table)
      .leftJoin(spools, eq(spoolFkColumn, table.id))
      .groupBy(table.id)
      .orderBy(asc(table.manufacturer), asc(table.name));
    return rows.map((r) => ({ ...(r.row as TRow), spoolCount: r.spoolCount }));
  }

  // Admin can edit any row, anytime, without changing its status. The
  // submitter can edit their own row while it's pending or rejected (never
  // once approved — it's global and others may reference it); editing a
  // rejected entry resubmits it as pending for re-review.
  async function update(id: string, input: TInput) {
    const user = await requireUser();
    const [existing] = await db.select().from(table).where(eq(table.id, id));
    if (!existing) throw new Error(notFoundMessage);
    const row = existing as unknown as TRow;

    const isAdmin = user.role === 'admin';
    const isOwnEditable = row.submittedById === user.id && row.status !== 'approved';
    if (!isAdmin && !isOwnEditable) throw new Error(notAuthorizedMessage);

    const values = validate(input);
    await db
      .update(table)
      .set({
        ...values,
        status: isAdmin ? row.status : 'pending',
        updatedAt: new Date(),
      })
      .where(eq(table.id, id));
    revalidateCatalog();
  }

  // Admin-only, and only when no spool references it (no data migration on
  // delete — see the DB-setup notes: FK enforcement is off, so this check is
  // the only thing preventing dangling spool FK references).
  async function remove(id: string) {
    await requireAdmin();
    const [usage] = await db
      .select({ count: count() })
      .from(spools)
      .where(eq(spoolFkColumn, id));
    if (usage.count > 0) throw new Error(inUseMessage);
    await db.delete(table).where(eq(table.id, id));
    revalidateCatalog();
  }

  return {
    getUsable,
    request,
    getPending,
    approve,
    reject,
    getAllForAdmin,
    update,
    remove,
  };
}
