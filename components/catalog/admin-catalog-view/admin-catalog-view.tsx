'use client';

import { ClipboardCheckIcon, SearchXIcon } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type {
  CatalogStatusCounts,
  CatalogStatusValue,
} from '@/lib/catalog-status';

import {
  AdminCatalogTable,
  type AdminCatalogTableRow,
} from '../admin-catalog-table';
import { CatalogToolbar } from '../catalog-toolbar';

type AdminStatusFilter = 'all' | CatalogStatusValue;

type AdminCatalogViewProps = {
  title: string;
  description: React.ReactNode;
  /** Name column header and search label noun: "Material" / "Spool type". */
  entityLabel: string;
  detailLabel: string;
  rows: readonly AdminCatalogTableRow[];
  /** Matches of the current search and status, before paging. */
  matching: number;
  statusCounts: CatalogStatusCounts;
  status: AdminStatusFilter;
  onStatusChange: (status: AdminStatusFilter) => void;
  query: string;
  onQueryChange: (query: string) => void;
  onClear: () => void;
  /** A server search is in flight. */
  busy?: boolean;
  /** The review queue route. */
  reviewHref: string;
  onApprove: (row: AdminCatalogTableRow) => void;
  onReject: (row: AdminCatalogTableRow) => void;
  onEdit: (row: AdminCatalogTableRow) => void;
  onDelete: (row: AdminCatalogTableRow) => void;
  busyId?: string | null;
  onLoadMore?: () => void;
  loadingMore?: boolean;
};

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * /admin/materials and /admin/spool-types (AdminMaterials board): the whole
 * catalog as a table, pending first, with a status filter, search and a
 * shortcut into the one-at-a-time review queue.
 */
function AdminCatalogView({
  title,
  description,
  entityLabel,
  detailLabel,
  rows,
  matching,
  statusCounts,
  status,
  onStatusChange,
  query,
  onQueryChange,
  onClear,
  busy = false,
  reviewHref,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  busyId,
  onLoadMore,
  loadingMore = false,
}: AdminCatalogViewProps) {
  const pending = statusCounts.pending;
  const total = statusCounts.approved + pending + statusCounts.rejected;
  const filtered = query.trim() !== '' || status !== 'all';

  return (
    <div className="flex flex-col gap-5 max-sm:gap-3">
      <PageHeader
        kicker="Admin"
        meta={`Global catalog · ${fmt(total)} entries`}
        title={title}
        description={description}
        actions={
          pending > 0 ? (
            <Link
              href={reviewHref}
              className={buttonVariants({ variant: 'accent' })}
            >
              <ClipboardCheckIcon />
              Review pending ({pending})
            </Link>
          ) : (
            <Button variant="outline" disabled>
              <ClipboardCheckIcon />
              Nothing to review
            </Button>
          )
        }
      />

      <CatalogToolbar
        query={query}
        onQueryChange={onQueryChange}
        searchLabel={`Search ${entityLabel.toLowerCase()}s`}
        onClear={filtered ? onClear : undefined}
        matching={matching}
        total={total}
        busy={busy}
      />

      <ToggleGroup
        aria-label="Filter by status"
        value={[status]}
        onValueChange={(next) =>
          onStatusChange((next[0] as AdminStatusFilter | undefined) ?? 'all')
        }
        className="max-sm:w-full max-sm:overflow-x-auto"
      >
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="approved">Approved</ToggleGroupItem>
        <ToggleGroupItem value="pending" count={pending}>
          Pending
        </ToggleGroupItem>
        <ToggleGroupItem value="rejected" count={statusCounts.rejected}>
          Rejected
        </ToggleGroupItem>
      </ToggleGroup>

      {rows.length === 0 ? (
        <EmptyState
          icon={<SearchXIcon />}
          title={
            status === 'pending' && !query.trim()
              ? 'Review queue is empty'
              : 'Nothing matches'
          }
          description={filtered ? 'Try another search or status.' : undefined}
          action={
            filtered ? (
              <Button variant="outline" onClick={onClear}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <AdminCatalogTable
          entityLabel={entityLabel}
          detailLabel={detailLabel}
          rows={rows}
          onApprove={onApprove}
          onReject={onReject}
          onEdit={onEdit}
          onDelete={onDelete}
          busyId={busyId}
        />
      )}

      {rows.length < matching && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="kicker">
            Showing first {fmt(rows.length)} of {fmt(matching)} — refine your
            search.
          </span>
          {onLoadMore && (
            <Button
              variant="outline"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export { AdminCatalogView };
export type { AdminStatusFilter };
