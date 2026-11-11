'use client';

import * as React from 'react';

import {
  approveSpoolType,
  deleteSpoolType,
  rejectSpoolType,
} from '@/app/actions/spool-types';
import { EditSpoolTypeDialog } from '@/components/catalog/edit-spool-type-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useKeyedAsyncAction } from '@/hooks/use-async-action';
import { useConfirm } from '@/hooks/use-confirm';
import type { AdminCatalogRow } from '@/lib/catalog';
import { countByStatus } from '@/lib/catalog-status';
import type { SpoolType } from '@/lib/db/schema';
import { formatWeight } from '@/lib/filament';
import { formatAgoShort } from '@/lib/relative-time';
import { matchesTokens, searchTokens } from '@/lib/search';

import type { AdminCatalogTableRow } from '../admin-catalog-table';
import { AdminCatalogView, type AdminStatusFilter } from './admin-catalog-view';

const MAX_ROWS = 150;

// Wires /admin/spool-types. The catalog is small, so the server sends all of
// it and search + status filter run here; row actions call the admin actions.
function AdminSpoolTypesContainer({
  spoolTypes,
  now,
}: {
  spoolTypes: AdminCatalogRow<SpoolType>[];
  /** Server render time, so "2 h ago" hydrates identically. */
  now: Date;
}) {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<AdminStatusFilter>('all');
  const [editing, setEditing] = React.useState<SpoolType | null>(null);
  const action = useKeyedAsyncAction<string>();
  const { confirm, dialogProps } = useConfirm();

  const statusCounts = countByStatus(
    spoolTypes.map((t) => ({ status: t.row.status, value: 1 }))
  );
  const tokens = searchTokens(query);
  const matches = spoolTypes.filter(
    ({ row }) =>
      (status === 'all' || row.status === status) &&
      matchesTokens(tokens, row.manufacturer, row.name)
  );
  const byId = new Map(spoolTypes.map((t) => [t.row.id, t.row]));

  const rows: AdminCatalogTableRow[] = matches
    .slice(0, MAX_ROWS)
    .map(({ row: t, submitterName, spoolCount }) => ({
      id: t.id,
      manufacturer: t.manufacturer,
      name: t.name,
      detail: formatWeight(t.emptyWeightGrams),
      status: t.status,
      submittedBy: submitterName,
      submittedAgo: formatAgoShort(t.createdAt, now),
      spoolCount,
    }));

  async function reject(row: AdminCatalogTableRow) {
    const ok = await confirm({
      title: `Reject ${row.name}?`,
      description:
        'It stays out of the global catalog. The submitter can still use it, and edit it to resubmit.',
      confirmLabel: 'Reject',
      destructive: true,
    });
    if (!ok) return;
    await action.run(row.id, () => rejectSpoolType(row.id), {
      success: 'Spool type rejected',
      error: 'Could not reject the spool type',
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
    await action.run(row.id, () => deleteSpoolType(row.id), {
      success: 'Spool type deleted',
      error: 'Could not delete the spool type — is a spool using it?',
    });
  }

  return (
    <>
      <AdminCatalogView
        title="Manage spool types"
        description="Approve or reject submissions, edit or delete any entry. Pending entries come first."
        entityLabel="Spool type"
        detailLabel="Empty spool"
        rows={rows}
        matching={matches.length}
        statusCounts={statusCounts}
        status={status}
        onStatusChange={setStatus}
        query={query}
        onQueryChange={setQuery}
        onClear={() => {
          setQuery('');
          setStatus('all');
        }}
        reviewHref="/admin/spool-types/review"
        onApprove={(row) =>
          action.run(row.id, () => approveSpoolType(row.id), {
            success: 'Spool type approved',
            error: 'Could not approve the spool type',
          })
        }
        onReject={reject}
        onEdit={(row) => setEditing(byId.get(row.id) ?? null)}
        onDelete={remove}
        busyId={action.pendingKey}
      />
      {editing && (
        <EditSpoolTypeDialog
          spoolType={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          isAdmin
        />
      )}
      <ConfirmDialog {...dialogProps} />
    </>
  );
}

export { AdminSpoolTypesContainer };
