import type * as React from 'react';

import { InitialsAvatar } from '@/components/common/initials-avatar';
import { groupStockState } from '@/components/groups/group-stock-row';
import { Meter } from '@/components/inventory/meter';
import { spoolNumber } from '@/components/inventory/spool-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatWeight } from '@/lib/filament';
import type { MaterialGroupSpool } from '@/lib/material-detail';
import { cn } from '@/lib/utils';

type MaterialGroupStockTableProps = {
  rows: MaterialGroupSpool[];
  currentUserId: string;
  onRequest?: (row: MaterialGroupSpool) => void;
  onCancelRequest?: (row: MaterialGroupSpool) => void;
  /** Key (`rowKey`) of the row whose action is running. */
  pendingKey?: string | null;
  className?: string;
};

/** A spool shared in two groups is two rows: lends are per group. */
const rowKey = (row: MaterialGroupSpool) => `${row.groupId}:${row.spool.id}`;

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

function RowAction({
  row,
  currentUserId,
  onRequest,
  onCancelRequest,
  pending,
}: {
  row: MaterialGroupSpool;
  currentUserId: string;
  onRequest?: (row: MaterialGroupSpool) => void;
  onCancelRequest?: (row: MaterialGroupSpool) => void;
  pending: boolean;
}): React.ReactNode {
  const state = groupStockState(row.spool, currentUserId);
  switch (state.kind) {
    case 'available':
      return (
        onRequest && (
          <Button
            size="sm"
            aria-label={`Request ${row.spool.ownerName}'s spool ${spoolNumber(row.number)}`}
            disabled={pending}
            onClick={() => onRequest(row)}
          >
            {pending ? 'Requesting…' : 'Request'}
          </Button>
        )
      );
    case 'requested-by-you':
      return (
        <>
          <Badge variant="accent">Awaiting approval</Badge>
          {onCancelRequest && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Cancel request for ${row.spool.ownerName}'s spool ${spoolNumber(row.number)}`}
              disabled={pending}
              onClick={() => onCancelRequest(row)}
            >
              Cancel
            </Button>
          )}
        </>
      );
    case 'requested-by-other':
      return (
        <span className="kicker">
          Requested by {firstName(state.borrowerName)}
        </span>
      );
    case 'with-you':
      return <Badge variant="accent">With you</Badge>;
    case 'lent-to-other':
      return (
        <Badge variant="muted">Lent · {firstName(state.borrowerName)}</Badge>
      );
    default:
      // Own spools are filtered out by getMaterialGroupStock.
      return null;
  }
}

/**
 * "04 In your groups" on the material page: other members' spools of this
 * material across the viewer's groups, with the borrow action that fits.
 * On narrow screens the group and level columns drop out
 * (MaterialDetailMobile board).
 */
function MaterialGroupStockTable({
  rows,
  currentUserId,
  onRequest,
  onCancelRequest,
  pendingKey,
  className,
}: MaterialGroupStockTableProps) {
  return (
    <Table className={cn('min-w-0', className)}>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Member</TableHead>
          <TableHead scope="col" className="max-sm:hidden">
            Group
          </TableHead>
          <TableHead scope="col">Spool</TableHead>
          <TableHead scope="col" className="text-right">
            Left
          </TableHead>
          <TableHead scope="col" className="w-[180px] max-md:hidden">
            Level
          </TableHead>
          <TableHead scope="col" className="text-right">
            Action
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const { spool } = row;
          const label = spoolNumber(row.number);
          return (
            <TableRow key={rowKey(row)} data-slot="material-group-stock-row">
              <TableCell>
                <span className="flex items-center gap-2">
                  <span aria-hidden className="flex">
                    <InitialsAvatar name={spool.ownerName} />
                  </span>
                  <span className="max-sm:hidden">{spool.ownerName}</span>
                  <span className="sm:hidden">
                    {firstName(spool.ownerName)}
                  </span>
                </span>
              </TableCell>
              <TableCell className="kicker max-sm:hidden">
                {row.groupName}
              </TableCell>
              <TableCell className="text-muted-foreground font-mono">
                {label}
              </TableCell>
              <TableCell className="display-num text-right text-xl">
                {formatWeight(spool.filamentLeftGrams)}
              </TableCell>
              <TableCell className="max-md:hidden">
                <Meter
                  value={spool.percentLeft}
                  tone={spool.isLow ? 'low' : 'default'}
                  aria-label={`${spool.ownerName}'s spool ${label} filament left`}
                />
              </TableCell>
              <TableCell>
                <span className="flex items-center justify-end gap-2">
                  <RowAction
                    row={row}
                    currentUserId={currentUserId}
                    onRequest={onRequest}
                    onCancelRequest={onCancelRequest}
                    pending={pendingKey === rowKey(row)}
                  />
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export { MaterialGroupStockTable, rowKey as materialGroupStockKey };
