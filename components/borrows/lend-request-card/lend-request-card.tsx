import {
  LendSpoolLabel,
  lendSpoolName,
  type LendSpool,
} from '@/components/borrows/lend-spool-label';
import { Swatch } from '@/components/inventory/swatch';
import { WeightDisplay } from '@/components/inventory/weight-display';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type LendRequestCardProps = {
  /**
   * `incoming`: someone asks for one of your spools (Approve / Decline).
   * `outgoing`: you asked someone else (Cancel).
   */
  direction: 'incoming' | 'outgoing';
  spool: LendSpool;
  /** The borrower for incoming requests, the owner for outgoing ones. */
  counterpartName: string;
  groupName: string;
  /** Already formatted for display: "3 h ago", "yesterday". */
  time: string;
  /** Machine-readable request time for the <time> element. */
  dateTime?: string;
  /** Incoming only: what's left on the spool. */
  filamentLeftGrams?: number;
  onApprove?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  /** Disables the actions while one of them runs. */
  pending?: boolean;
  className?: string;
};

/**
 * An open borrow request (Borrows 01 + 02). Incoming requests are dashed
 * cards with Approve / Decline; your own outgoing ones are a compact line
 * with "Awaiting approval" and Cancel.
 */
function LendRequestCard({
  direction,
  spool,
  counterpartName,
  groupName,
  time,
  dateTime,
  filamentLeftGrams,
  onApprove,
  onDecline,
  onCancel,
  pending,
  className,
}: LendRequestCardProps) {
  if (direction === 'outgoing') {
    return (
      <div
        data-slot="lend-request-card"
        data-direction="outgoing"
        className={cn(
          'border-border flex items-center gap-3 border-t py-3 first:border-t-0 first:pt-0',
          className
        )}
      >
        <Swatch color={spool.color} decorative />
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="truncate text-sm">
            <span className="font-medium">{lendSpoolName(spool)}</span>{' '}
            <span className="text-muted-foreground">
              from {counterpartName}
            </span>
          </span>
          <span className="kicker">
            {groupName} · <time dateTime={dateTime}>{time}</time>
          </span>
        </span>
        <Badge variant="accent">Awaiting approval</Badge>
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </div>
    );
  }

  return (
    <article
      data-slot="lend-request-card"
      data-direction="incoming"
      aria-label={`${counterpartName} wants ${lendSpoolName(spool)}`}
      className={cn(
        'border-ink bg-card text-card-foreground flex flex-col gap-3.5 rounded-[4px] border border-dashed p-4',
        className
      )}
    >
      <div className="kicker flex justify-between gap-3">
        <span className="text-accent truncate">{groupName}</span>
        <time dateTime={dateTime} className="shrink-0">
          {time}
        </time>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="kicker">From</span>
          <span className="truncate text-sm font-semibold">
            {counterpartName}
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="kicker">Wants</span>
          <LendSpoolLabel
            spool={spool}
            className="gap-1.5 text-sm font-semibold"
          />
        </span>
        {filamentLeftGrams !== undefined && (
          <WeightDisplay
            grams={filamentLeftGrams}
            size="block"
            className="ml-auto text-[28px]"
          />
        )}
      </div>
      {(onApprove || onDecline) && (
        <div className="flex gap-2">
          {onApprove && (
            <Button
              size="sm"
              className="flex-1"
              disabled={pending}
              onClick={onApprove}
            >
              Approve
            </Button>
          )}
          {onDecline && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={pending}
              onClick={onDecline}
            >
              Decline
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

export { LendRequestCard };
