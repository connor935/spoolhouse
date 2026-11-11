'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import {
  approveMaterial,
  deleteMaterial,
  rejectMaterial,
  searchMaterialsForAdmin,
  type AdminMaterialRow,
} from '@/app/actions/materials';
import { EditMaterialDialog } from '@/components/catalog/edit-material-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useKeyedAsyncAction } from '@/hooks/use-async-action';
import { useConfirm } from '@/hooks/use-confirm';
import { useUrlSearchQuery } from '@/hooks/use-url-search-query';
import {
  materialCatalogSearch,
  type MaterialCatalogFilters,
} from '@/lib/catalog-params';
import type { CatalogStatusCounts } from '@/lib/catalog-status';
import type { Material } from '@/lib/db/schema';
import { formatAgoShort } from '@/lib/relative-time';
import { uniqueBy } from '@/lib/unique-by';

import type { AdminCatalogTableRow } from '../admin-catalog-table';
import { AdminCatalogView, type AdminStatusFilter } from './admin-catalog-view';

const PAGE_SIZE = 150;

type AdminMaterialsContainerProps = {
  filters: MaterialCatalogFilters;
  firstPage: { rows: AdminMaterialRow[]; total: number };
  statusCounts: CatalogStatusCounts;
  /** Server render time, so "2 h ago" hydrates identically. */
  now: Date;
};

function toTableRow(r: AdminMaterialRow, now: Date): AdminCatalogTableRow {
  const m = r.material;
  return {
    id: m.id,
    manufacturer: m.manufacturer,
    name: m.name,
    color: m.color,
    detail: m.filamentType,
    status: m.status,
    submittedBy: r.submitterName,
    submittedAgo: formatAgoShort(m.createdAt, now),
    spoolCount: r.spoolCount,
    href: `/materials/${m.id}?from=admin`,
  };
}

// Wires /admin/materials: search and status live in the URL (the server page
// re-queries), Load more appends pages for the current search, and the row
// actions call the admin catalog actions (each re-checks requireAdmin).
function AdminMaterialsContainer({
  filters,
  firstPage,
  statusCounts,
  now,
}: AdminMaterialsContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, startTransition] = React.useTransition();
  // Extra pages belong to the first page they extend: any server refresh
  // (new filters, or router.refresh after a decision re-sorts pending-first)
  // brings a new one and drops them, so no row shows a stale status.
  const [appended, setAppended] = React.useState<{
    base: AdminMaterialRow[];
    rows: AdminMaterialRow[];
  } | null>(null);
  const more = appended?.base === firstPage.rows ? appended.rows : [];
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [editing, setEditing] = React.useState<Material | null>(null);
  const action = useKeyedAsyncAction<string>();
  const { confirm, dialogProps } = useConfirm();

  const navigate = React.useCallback(
    (next: MaterialCatalogFilters) => {
      const search = materialCatalogSearch(next);
      startTransition(() => {
        router.replace(search ? `${pathname}?${search}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router]
  );

  const { query, setQuery, reset } = useUrlSearchQuery(
    filters.q,
    (q) => navigate({ ...filters, q }),
    busy
  );

  const all = uniqueBy([...firstPage.rows, ...more], (r) => r.material.id);
  const materialsById = new Map(all.map((r) => [r.material.id, r.material]));
  const material = (row: AdminCatalogTableRow) => materialsById.get(row.id)!;

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await searchMaterialsForAdmin({
        q: filters.q,
        filamentTypes: filters.filamentTypes,
        constraints: filters.constraints,
        status: filters.status,
        limit: PAGE_SIZE,
        offset: all.length,
      });
      setAppended({ base: firstPage.rows, rows: [...more, ...page.rows] });
    } catch {
      toast.error('Could not load more materials — try again');
    } finally {
      setLoadingMore(false);
    }
  }

  async function reject(row: AdminCatalogTableRow) {
    const ok = await confirm({
      title: `Reject ${row.name}?`,
      description:
        'It stays out of the global catalog. The submitter can still use it, and edit it to resubmit.',
      confirmLabel: 'Reject',
      destructive: true,
    });
    if (!ok) return;
    await action.run(row.id, () => rejectMaterial(row.id), {
      success: 'Material rejected',
      error: 'Could not reject the material',
    });
  }

  async function remove(row: AdminCatalogTableRow) {
    const ok = await confirm({
      title: `Delete ${row.name}?`,
      description: 'Removes it from the catalog for everyone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await action.run(row.id, () => deleteMaterial(row.id), {
      success: 'Material deleted',
      error: 'Could not delete the material — is a spool using it?',
    });
  }

  return (
    <>
      <AdminCatalogView
        title="Manage materials"
        description="Approve or reject submissions, edit or delete any entry. Pending entries come first."
        entityLabel="Material"
        detailLabel="Type"
        rows={all.map((r) => toTableRow(r, now))}
        matching={firstPage.total}
        statusCounts={statusCounts}
        status={(filters.status as AdminStatusFilter | null) ?? 'all'}
        onStatusChange={(status) =>
          navigate({
            ...filters,
            q: query,
            status: status === 'all' ? null : status,
          })
        }
        query={query}
        onQueryChange={setQuery}
        onClear={() => {
          reset('');
          navigate({ q: '', filamentTypes: [], status: null, constraints: [] });
        }}
        busy={busy}
        reviewHref="/admin/materials/review"
        onApprove={(row) =>
          action.run(row.id, () => approveMaterial(row.id), {
            success: 'Material approved',
            error: 'Could not approve the material',
          })
        }
        onReject={reject}
        onEdit={(row) => setEditing(material(row))}
        onDelete={remove}
        busyId={action.pendingKey}
        onLoadMore={loadMore}
        loadingMore={loadingMore}
      />
      {editing && (
        <EditMaterialDialog
          material={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          isAdmin
        />
      )}
      <ConfirmDialog {...dialogProps} />
    </>
  );
}

export { AdminMaterialsContainer };
