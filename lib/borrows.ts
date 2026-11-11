import type { LendHistoryEntry } from '@/components/borrows/lend-history-table';
import type { LendSpool } from '@/components/borrows/lend-spool-label';
import { lendUsageGrams, pricePerGramCents } from '@/lib/filament';

// Pure shaping for the /borrows page: which section a lend belongs to from the
// current user's side, and the display entries the borrow compounds take.

/** The fields of a `getMyLends()` row this module needs. */
export type BorrowLend = {
  lend: {
    id: string;
    status: string;
    borrowerId: string;
    requestedAt: Date;
    respondedAt: Date | null;
    returnedAt: Date | null;
    startWeightGrams: number | null;
    endWeightGrams: number | null;
  };
  ownerId: string;
  ownerName: string;
  borrowerName: string;
  groupName: string;
  materialName: string;
  materialColor: string | null;
  spoolNumber: number | null;
  measuredTotalWeightGrams: number;
  fullFilamentWeightGrams: number;
  pricePaidCents: number | null;
};

export type SplitLends<T extends BorrowLend> = {
  /** Requests for your spools, waiting for your answer. */
  incoming: T[];
  /** Your requests for other people's spools. */
  outgoing: T[];
  lentOut: T[];
  borrowed: T[];
  /** Returned and declined lends, most recently ended first. */
  history: T[];
};

// When a closed lend ended: the return, or the decline.
const endedAt = (l: BorrowLend['lend']) =>
  (l.returnedAt ?? l.respondedAt ?? l.requestedAt).getTime();

export function splitLends<T extends BorrowLend>(
  rows: T[],
  userId: string
): SplitLends<T> {
  const mine = (r: T) => r.ownerId === userId;
  const byStatus = (status: string) =>
    rows.filter((r) => r.lend.status === status);
  return {
    incoming: byStatus('requested').filter(mine),
    outgoing: byStatus('requested').filter((r) => !mine(r)),
    lentOut: byStatus('active').filter(mine),
    borrowed: byStatus('active').filter((r) => !mine(r)),
    history: rows
      .filter(
        (r) => r.lend.status === 'returned' || r.lend.status === 'declined'
      )
      .sort((a, b) => endedAt(b.lend) - endedAt(a.lend)),
  };
}

export function lendSpool(row: BorrowLend): LendSpool {
  return {
    materialName: row.materialName,
    color: row.materialColor,
    number: row.spoolNumber,
  };
}

/** Grams used so far (active) or in total (returned); null when unknown. */
export function lendUsed(row: BorrowLend): number | null {
  return lendUsageGrams({
    startWeightGrams: row.lend.startWeightGrams,
    endWeightGrams: row.lend.endWeightGrams,
    currentWeightGrams: row.measuredTotalWeightGrams,
  });
}

export function historyEntry(
  row: BorrowLend,
  userId: string
): LendHistoryEntry {
  const returned = row.lend.status === 'returned';
  const usedGrams = returned ? lendUsed(row) : null;
  const perGram = pricePerGramCents(row);
  const out = row.ownerId === userId;
  return {
    id: row.lend.id,
    spool: lendSpool(row),
    direction: out ? 'out' : 'in',
    counterpartName: out ? row.borrowerName : row.ownerName,
    groupName: row.groupName,
    status: returned ? 'returned' : 'declined',
    startedAt: (returned && row.lend.respondedAt) || row.lend.requestedAt,
    endedAt: returned ? row.lend.returnedAt : null,
    usedGrams,
    costCents:
      usedGrams === null || perGram === null
        ? null
        : Math.round(usedGrams * perGram),
  };
}
