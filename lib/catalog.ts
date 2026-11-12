import 'server-only';

import { db } from '@/lib/db';
import { spools, user } from '@/lib/db/schema';
import { pendingFirst } from '@/lib/catalog-status';
import { requireAdmin, requireUser } from '@/lib/auth-session';
import { and, asc, count, eq, ne, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';

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

export type AdminCatalogRow<TRow> = {
  row: TRow;
  /** null for imported rows. */
  submitterName: string | null;
  spoolCount: number;
};

type CatalogConfig<TInput> = {
  table: PgTable & {
    id: PgColumn;
    manufacturer: PgColumn;
    name: PgColumn;
    status: PgColumn;
    submittedById: PgColumn;
    reviewedById: PgColumn;
    createdAt: PgColumn;
    updatedAt: PgColumn;
  };
  spoolFkColumn: PgColumn;
  revalidatePaths: readonly [string, string];
  validate: (input: TInput) => Record<string, unknown>;
  notFoundMessage: string;
  notAuthorizedMessage: string;
  inUseMessage: string;
  onRemove?: (id: string) => Promise<void>;
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
    onRemove,
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
      .where(or(eq(table.status, 'approved'), eq(table.submittedById, user.id)))
      .orderBy(asc(table.manufacturer), asc(table.name)) as Promise<TRow[]>;
  }

  // Any user can submit; it lands as `pending` and is immediately usable by
  // the submitter. Admin AND trusted-contributor submissions are auto-approved
  // (self-reviewed) — see lib/auth.ts for the trustedContributor field.
  async function request(input: TInput): Promise<TRow> {
    const user = await requireUser();
    const values = validate(input);
    const autoApprove =
      user.role === 'admin' || user.trustedContributor === true;
    const [created] = await db
      .insert(table)
      .values({
        ...values,
        status: autoApprove ? 'approved' : 'pending',
        submittedById: user.id,
        reviewedById: autoApprove ? user.id : undefined,
      })
      .returning();
    revalidateCatalog();
    return created as TRow;
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
      .set({
        status: 'rejected',
        reviewedById: admin.id,
        updatedAt: new Date(),
      })
      .where(and(eq(table.id, id), ne(table.status, 'approved')));
    revalidateCatalog();
  }

  // Full catalog for the admin table, pending first, with the submitter's
  // name and how many spools reference each row (governs whether it can be
  // deleted). Only for the small spool-type catalog: materials are paged in
  // SQL (searchMaterialsForAdmin).
  async function getAllForAdmin(): Promise<AdminCatalogRow<TRow>[]> {
    await requireAdmin();
    const rows = await db
      .select({
        row: table,
        submitterName: user.name,
        spoolCount: count(spools.id),
      })
      .from(table)
      .leftJoin(spools, eq(spoolFkColumn, table.id))
      .leftJoin(user, eq(table.submittedById, user.id))
      .groupBy(table.id, user.name)
      .orderBy(
        pendingFirst(table.status),
        asc(table.manufacturer),
        asc(table.name),
        asc(table.id)
      );
    return rows.map((r) => ({
      row: r.row as TRow,
      submitterName: r.submitterName,
      spoolCount: r.spoolCount,
    }));
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
    const isOwnEditable =
      row.submittedById === user.id && row.status !== 'approved';
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
    await onRemove?.(id);
    await db.delete(table).where(eq(table.id, id));
    revalidateCatalog();
  }

  return {
    getUsable,
    request,
    approve,
    reject,
    getAllForAdmin,
    update,
    remove,
  };
}
