'use client';

import { spoolNumber } from '@/components/inventory/spool-tile';
import { Meter } from '@/components/inventory/meter';
import { Swatch } from '@/components/inventory/swatch';
import { WeightDisplay } from '@/components/inventory/weight-display';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** The requested spool, when the caller has it loaded. */
export type BorrowRequestSpool = {
  number?: number | null;
  color?: string | null;
  filamentType: string;
  location?: string | null;
  filamentLeftGrams: number;
  percentLeft: number;
};

export type BorrowRequest = {
  requesterName: string;
  materialName: string;
  groupName: string;
  /** Already formatted for display: "just now", "3 h ago". */
  time: string;
  /** Without it the dialog names the material only (notification rows). */
  spool?: BorrowRequestSpool;
};

type BorrowRequestDialogProps = {
  /** The request to answer; null closes the dialog. */
  request: BorrowRequest | null;
  /** "Later" / Escape / close button: leaves the request open. */
  onClose: () => void;
  onApprove: () => void;
  onDecline: () => void;
  /** Disables Approve / Decline while one of them runs. */
  pending?: boolean;
};

/**
 * Approve / decline a borrow request (BorrowDialog board), opened from an
 * actionable notification. Closing it is "later": the request stays open.
 */
function BorrowRequestDialog({
  request,
  onClose,
  onApprove,
  onDecline,
  pending,
}: BorrowRequestDialogProps) {
  const firstName = request?.requesterName.trim().split(/\s+/)[0];
  const spool = request?.spool;
  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        {request && (
          <>
            <DialogHeader kicker={`${request.groupName} · ${request.time}`}>
              <DialogTitle className="text-[30px]">Borrow request</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <DialogDescription className="text-foreground">
                <strong className="font-semibold">
                  {request.requesterName}
                </strong>{' '}
                wants to borrow{' '}
                {spool ? (
                  'one of your spools.'
                ) : (
                  <>
                    your{' '}
                    <strong className="font-semibold">
                      {request.materialName}
                    </strong>{' '}
                    in {request.groupName}.
                  </>
                )}
              </DialogDescription>
              {spool && (
                <div
                  data-slot="borrow-request-spool"
                  className="border-ink flex items-center gap-3.5 rounded-[4px] border p-3.5"
                >
                  <Swatch color={spool.color} size="xl" decorative />
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      {spool.number && (
                        <span className="text-muted-foreground font-mono text-xs font-medium">
                          {spoolNumber(spool.number)}
                        </span>
                      )}
                      <span className="display-name text-xl">
                        {request.materialName}
                      </span>
                      <Badge>{spool.filamentType}</Badge>
                      {spool.location && (
                        <Badge variant="inverted">{spool.location}</Badge>
                      )}
                    </span>
                    <Meter
                      value={spool.percentLeft}
                      aria-label={`${request.materialName} filament left`}
                    />
                  </span>
                  <WeightDisplay
                    grams={spool.filamentLeftGrams}
                    size="readout"
                    className="text-[34px]"
                  />
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                While it&apos;s lent, {firstName} re-weighs it; only you can
                mark it returned.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose} className="sm:mr-auto">
                Later
              </Button>
              <Button variant="outline" onClick={onDecline} disabled={pending}>
                Decline
              </Button>
              <Button onClick={onApprove} disabled={pending}>
                {pending ? 'Working…' : 'Approve'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { BorrowRequestDialog };
