import {
  LendSpoolLabel,
  shortDate,
  type LendSpool,
} from '@/components/borrows/lend-spool-label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney, formatWeight } from '@/lib/filament';
import { cn } from '@/lib/utils';

/**
 * How a closed lend ended. `cancelled` is for display only: the backend
 * deletes withdrawn requests (`cancelLendRequest`), so they never reach the
 * history today.
 */
export type LendHistoryStatus = 'returned' | 'declined' | 'cancelled';

export type LendHistoryEntry = {
  id: string;
  spool: LendSpool;
  /** `out`: you lent it to them. `in`: you borrowed it from them. */
  direction: 'out' | 'in';
  counterpartName: string;
  groupName: string;
  status: LendHistoryStatus;
  /** Approval date for returned lends, request date otherwise. */
  startedAt: Date;
  /** Return date; null for declined / cancelled requests. */
  endedAt: Date | null;
  /** `lendUsageGrams`; null when the lend predates weight snapshots. */
  usedGrams: number | null;
  /** Used grams × price per gram; null when the spool has no price. */
  costCents: number | null;
};

const STATUS: Record<
  LendHistoryStatus,
  { label: string; variant: 'default' | 'muted' }
> = {
  returned: { label: 'Returned', variant: 'default' },
  declined: { label: 'Declined', variant: 'muted' },
  cancelled: { label: 'Cancelled', variant: 'muted' },
};

function Missing() {
  return (
    <span className="text-muted-foreground">
      <span aria-hidden>—</span>
      <span className="sr-only">none</span>
    </span>
  );
}

/** Borrows 05: closed lends in both directions, newest first. */
function LendHistoryTable({
  entries,
  className,
}: {
  entries: LendHistoryEntry[];
  className?: string;
}) {
  return (
    <Table data-slot="lend-history-table" className={cn(className)}>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Spool</TableHead>
          <TableHead scope="col">With</TableHead>
          <TableHead scope="col">Group</TableHead>
          <TableHead scope="col">Period</TableHead>
          <TableHead scope="col">Status</TableHead>
          <TableHead scope="col" align="right">
            Used
          </TableHead>
          <TableHead scope="col" align="right">
            Cost
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const status = STATUS[entry.status];
          const returned = entry.status === 'returned';
          const out = entry.direction === 'out';
          return (
            <TableRow key={entry.id}>
              <TableCell>
                <LendSpoolLabel spool={entry.spool} />
              </TableCell>
              <TableCell>
                <span aria-hidden>{out ? '→' : '←'}</span>
                <span className="sr-only">
                  {out ? 'Lent to' : 'Borrowed from'}
                </span>{' '}
                {entry.counterpartName}
              </TableCell>
              <TableCell className="kicker">{entry.groupName}</TableCell>
              <TableCell className="font-mono text-xs whitespace-nowrap">
                {shortDate(entry.startedAt)}
                {entry.endedAt && <> – {shortDate(entry.endedAt)}</>}
              </TableCell>
              <TableCell>
                <Badge variant={status.variant}>{status.label}</Badge>
              </TableCell>
              <TableCell align="right" className="font-mono">
                {returned && entry.usedGrams !== null ? (
                  `−${formatWeight(entry.usedGrams)}`
                ) : (
                  <Missing />
                )}
              </TableCell>
              <TableCell align="right" className="font-mono">
                {returned && entry.costCents !== null ? (
                  formatMoney(entry.costCents)
                ) : (
                  <Missing />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export { LendHistoryTable };
