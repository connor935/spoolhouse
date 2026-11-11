import Link from 'next/link';
import type * as React from 'react';

import { StatusBadge } from '@/components/common/status-badge';
import { Swatch } from '@/components/inventory/swatch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { CatalogRowActions } from '../catalog-row';

type AdminCatalogTableRow = {
  id: string;
  manufacturer: string;
  name: string;
  /** Material colour; `undefined` hides the swatch (spool types). */
  color?: string | null;
  /** Second column: the filament type, or a spool type's empty weight. */
  detail: string;
  status: string;
  /** null for imported rows. */
  submittedBy: string | null;
  /** Preformatted age, e.g. "2 h ago". */
  submittedAgo: string;
  /** Spools on it across all users; > 0 blocks Delete. */
  spoolCount: number;
  /** Opens the entry (material detail page). */
  href?: string;
};

type AdminCatalogTableProps = {
  /** Header of the name column: "Material" or "Spool type". */
  entityLabel: string;
  /** Header of the detail column: "Type" or "Empty spool". */
  detailLabel: string;
  rows: readonly AdminCatalogTableRow[];
  onApprove: (row: AdminCatalogTableRow) => void;
  onReject: (row: AdminCatalogTableRow) => void;
  onEdit: (row: AdminCatalogTableRow) => void;
  onDelete: (row: AdminCatalogTableRow) => void;
  /** Row whose action is in flight; its controls are disabled. */
  busyId?: string | null;
  className?: string;
};

function statusOf(status: string) {
  return status === 'approved' || status === 'rejected' ? status : 'pending';
}

const spools = (n: number) => `${n} ${n === 1 ? 'spool' : 'spools'}`;

/**
 * The admin catalog table (AdminMaterials board): entry, detail tag, status,
 * submitter + age and the inline review/edit/delete controls. Rows arrive in
 * display order (pending first). On phones the detail and submitter columns
 * fold into the entry cell.
 */
function AdminCatalogTable({
  entityLabel,
  detailLabel,
  rows,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  busyId,
  className,
}: AdminCatalogTableProps) {
  return (
    <Table data-slot="admin-catalog-table" className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>{entityLabel}</TableHead>
          <TableHead className="max-sm:hidden">{detailLabel}</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="max-md:hidden">Submitted</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} data-status={row.status}>
            <TableCell>
              <EntryCell row={row} />
            </TableCell>
            <TableCell className="max-sm:hidden">
              <Badge>{row.detail}</Badge>
            </TableCell>
            <TableCell>
              <StatusBadge status={statusOf(row.status)} />
            </TableCell>
            <TableCell className="max-md:hidden">
              <span className="flex flex-col gap-0.5">
                <span>{row.submittedBy ?? 'Imported'}</span>
                <span className="kicker">{row.submittedAgo}</span>
              </span>
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
              <CatalogRowActions
                status={row.status}
                name={row.name}
                busy={busyId === row.id}
                onApprove={() => onApprove(row)}
                onReject={() => onReject(row)}
                onEdit={() => onEdit(row)}
                onDelete={() => onDelete(row)}
                deleteBlockedReason={
                  row.spoolCount > 0
                    ? `In use by ${spools(row.spoolCount)}`
                    : undefined
                }
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EntryCell({ row }: { row: AdminCatalogTableRow }) {
  const name: React.ReactNode = (
    <>
      {/* The space sits outside the span so it survives in the link's name. */}
      <span className="text-muted-foreground">{row.manufacturer} ·</span>{' '}
      <span className="font-medium">{row.name}</span>
    </>
  );
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {row.color !== undefined && <Swatch color={row.color} decorative />}
      <span className="flex min-w-0 flex-col gap-0.5">
        {row.href ? (
          <Link
            href={row.href}
            className="underline-offset-2 outline-none hover:underline focus-visible:underline"
          >
            {name}
          </Link>
        ) : (
          <span>{name}</span>
        )}
        <span className="kicker md:hidden">
          {[row.detail, row.submittedBy ?? 'Imported', row.submittedAgo].join(
            ' · '
          )}
        </span>
      </span>
    </span>
  );
}

export { AdminCatalogTable };
export type { AdminCatalogTableRow };
