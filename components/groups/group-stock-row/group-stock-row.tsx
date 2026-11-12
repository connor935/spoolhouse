import type * as React from 'react';

import { shortDate } from '@/components/borrows/lend-spool-label';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { Meter } from '@/components/inventory/meter';
import { spoolNumber } from '@/components/inventory/spool-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatWeight } from '@/lib/filament';
import type { SharedSpool } from '@/lib/sharing';
import { cn } from '@/lib/utils';

/** Who may do what with one pooled spool, from the viewer's side. */
export type GroupStockState =
  | { kind: 'own' }
  | { kind: 'own-requested'; borrowerName: string }
  | { kind: 'own-lent'; borrowerName: string }
  | { kind: 'available' }
  | { kind: 'requested-by-you' }
  | { kind: 'requested-by-other'; borrowerName: string }
  | { kind: 'with-you' }
  | { kind: 'lent-to-other'; borrowerName: string };

type StockSpool = Pick<SharedSpool, 'ownerId' | 'lentTo' | 'pendingRequest'>;

/** First name only, as the stock rows say it: "Requested by Tom". */
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

function groupStockState(
  spool: StockSpool,
  currentUserId: string
): GroupStockState {
  if (spool.ownerId === currentUserId) {
    if (spool.lentTo)
      return { kind: 'own-lent', borrowerName: spool.lentTo.borrowerName };
    if (spool.pendingRequest)
      return {
        kind: 'own-requested',
        borrowerName: spool.pendingRequest.borrowerName,
      };
    return { kind: 'own' };
  }
  if (spool.lentTo)
    return spool.lentTo.borrowerId === currentUserId
      ? { kind: 'with-you' }
      : { kind: 'lent-to-other', borrowerName: spool.lentTo.borrowerName };
  if (spool.pendingRequest)
    return spool.pendingRequest.borrowerId === currentUserId
      ? { kind: 'requested-by-you' }
      : {
          kind: 'requested-by-other',
          borrowerName: spool.pendingRequest.borrowerName,
        };
  return { kind: 'available' };
}

type GroupStockRowProps = {
  spool: SharedSpool;
  /** Position in the owner's oldest-first list of this material. */
  number?: number;
  currentUserId: string;
  /** When the spool came to you; adds "since 07 Nov" to "With you". */
  lentSince?: Date | null;
  onRequest?: () => void;
  onCancelRequest?: () => void;
  onMarkReturned?: () => void;
  /** Disables the row's action while it runs. */
  pending?: boolean;
  className?: string;
};

/**
 * One spool in a group's pooled stock (Group board `.srow`): owner, number,
 * weight left, meter and the action that fits the viewer: Request, Cancel
 * your own request, Mark returned on your lent spool, or just a status.
 */
function GroupStockRow({
  spool,
  number,
  currentUserId,
  lentSince,
  onRequest,
  onCancelRequest,
  onMarkReturned,
  pending,
  className,
}: GroupStockRowProps) {
  const state = groupStockState(spool, currentUserId);
  const own = spool.ownerId === currentUserId;
  const label = number ? spoolNumber(number) : null;

  let action: React.ReactNode;
  switch (state.kind) {
    case 'own':
      action = <Badge variant="muted">Your spool</Badge>;
      break;
    case 'own-requested':
      action = (
        <span className="kicker">
          Requested by {firstName(state.borrowerName)}
        </span>
      );
      break;
    case 'own-lent':
      action = (
        <>
          <Badge variant="accent">Lent · {firstName(state.borrowerName)}</Badge>
          {onMarkReturned && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={onMarkReturned}
            >
              Mark returned
            </Button>
          )}
        </>
      );
      break;
    case 'available':
      action = onRequest && (
        <Button size="sm" disabled={pending} onClick={onRequest}>
          {pending ? 'Requesting…' : 'Request'}
        </Button>
      );
      break;
    case 'requested-by-you':
      action = (
        <>
          <Badge variant="accent">Requested · pending</Badge>
          {onCancelRequest && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={onCancelRequest}
            >
              Cancel
            </Button>
          )}
        </>
      );
      break;
    case 'requested-by-other':
      action = (
        <span className="kicker">
          Requested by {firstName(state.borrowerName)}
        </span>
      );
      break;
    case 'with-you':
      action = (
        <Badge variant="accent">
          With you{lentSince && ` since ${shortDate(lentSince)}`}
        </Badge>
      );
      break;
    case 'lent-to-other':
      action = (
        <Badge variant="muted">Lent · {firstName(state.borrowerName)}</Badge>
      );
      break;
  }

  return (
    <li
      data-slot="group-stock-row"
      data-state={state.kind}
      className={cn(
        'border-border grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-t py-2.5 text-sm sm:grid-cols-[minmax(150px,1fr)_40px_70px_minmax(80px,160px)_260px]',
        className
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="flex">
          <InitialsAvatar name={spool.ownerName} you={own} />
        </span>
        <span className="truncate">{own ? 'You' : spool.ownerName}</span>
      </span>
      <span className="text-muted-foreground font-mono text-xs max-sm:hidden">
        {label}
      </span>
      <span className="font-mono font-semibold max-sm:justify-self-end">
        {formatWeight(spool.filamentLeftGrams)}
      </span>
      <Meter
        value={spool.percentLeft}
        tone={spool.isLow ? 'low' : 'default'}
        aria-label={`${own ? 'Your' : `${spool.ownerName}'s`} spool${label ? ` ${label}` : ''} filament left`}
        className="max-sm:hidden"
      />
      <span className="flex items-center gap-2 justify-self-end max-sm:col-span-2">
        {action}
      </span>
    </li>
  );
}

export { GroupStockRow, groupStockState };
