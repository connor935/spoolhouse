'use client';

import { useMemo, useState } from 'react';
import { setMeasuredWeight } from '@/app/actions/filaments';
import {
  approveLend,
  cancelLendRequest,
  declineLend,
  markReturned,
  type MyLend,
} from '@/app/actions/lends';
import { ReweighPopover } from '@/components/inventory/reweigh-popover';
import { ReweighSheet } from '@/components/inventory/reweigh-sheet';
import { useKeyedAsyncAction } from '@/hooks/use-async-action';
import { historyEntry, lendSpool, lendUsed, splitLends } from '@/lib/borrows';
import { relativeTime } from '@/lib/dates';
import { LEND_ERROR, LEND_TOAST } from '@/lib/lend-toast';
import { lendSpoolName } from '../lend-spool-label';
import { BorrowsView } from './borrows-view';

// Same breakpoint where the shell swaps the sidebar for the bottom nav.
const MOBILE_QUERY = '(max-width: 767px)';

type Weighing = { lend: MyLend; anchor: HTMLElement; mobile: boolean };

/** Wires /borrows to the lend actions and the borrower's re-weigh. */
function BorrowsContainer({
  lends,
  userId,
  now,
}: {
  lends: MyLend[];
  userId: string;
  /** Server time, so relative times render the same on server and client. */
  now: Date;
}) {
  const { pendingKey, run } = useKeyedAsyncAction<string>();
  const [weighing, setWeighing] = useState<Weighing | null>(null);
  const split = useMemo(() => splitLends(lends, userId), [lends, userId]);
  const byId = useMemo(
    () => new Map(lends.map((l) => [l.lend.id, l])),
    [lends]
  );

  const request = (l: MyLend) => ({
    id: l.lend.id,
    spool: lendSpool(l),
    groupName: l.groupName,
    time: relativeTime(l.lend.requestedAt, now),
    dateTime: l.lend.requestedAt.toISOString(),
  });
  // Active lends always have respondedAt (set on approval).
  const since = (l: MyLend) => l.lend.respondedAt ?? l.lend.requestedAt;

  const act =
    (fn: (id: string) => Promise<void>, success: string, error: string) =>
    (id: string) =>
      run(id, () => fn(id), { success, error });

  const saveWeight = (grams: number) => {
    if (!weighing) return;
    const { lend } = weighing;
    run(lend.lend.id, () => setMeasuredWeight(lend.lend.filamentId, grams), {
      success: 'Weight updated',
      error: LEND_ERROR.weighed,
      onSuccess: () => setWeighing(null),
    });
  };

  const formProps = weighing && {
    open: true,
    onOpenChange: (open: boolean) => !open && setWeighing(null),
    title: `Re-weigh ${lendSpoolName(lendSpool(weighing.lend))}`,
    spool: weighing.lend.spoolView,
    now,
    pending: pendingKey === weighing.lend.lend.id,
    onSave: saveWeight,
  };

  return (
    <>
      <BorrowsView
        incoming={split.incoming.map((l) => ({
          ...request(l),
          requesterName: l.borrowerName,
          filamentLeftGrams: l.spoolView.filamentLeftGrams,
        }))}
        outgoing={split.outgoing.map((l) => ({
          ...request(l),
          ownerName: l.ownerName,
        }))}
        lentOut={split.lentOut.map((l) => ({
          id: l.lend.id,
          spool: lendSpool(l),
          groupName: l.groupName,
          borrowerName: l.borrowerName,
          since: since(l),
          usedGrams: lendUsed(l),
        }))}
        borrowed={split.borrowed.map((l) => ({
          id: l.lend.id,
          spool: lendSpool(l),
          groupName: l.groupName,
          ownerName: l.ownerName,
          since: since(l),
          filamentLeftGrams: l.spoolView.filamentLeftGrams,
          percentLeft: l.spoolView.percentLeft,
        }))}
        history={split.history.map((l) => historyEntry(l, userId))}
        pendingId={pendingKey}
        onApprove={act(approveLend, LEND_TOAST.approved, LEND_ERROR.answered)}
        onDecline={act(declineLend, LEND_TOAST.declined, LEND_ERROR.answered)}
        onCancel={act(
          cancelLendRequest,
          LEND_TOAST.cancelled,
          LEND_ERROR.cancelled
        )}
        onMarkReturned={act(
          markReturned,
          LEND_TOAST.returned,
          LEND_ERROR.returned
        )}
        onWeigh={(id, anchor) => {
          const lend = byId.get(id);
          if (lend)
            setWeighing({
              lend,
              anchor,
              mobile: window.matchMedia(MOBILE_QUERY).matches,
            });
        }}
      />
      {weighing &&
        formProps &&
        (weighing.mobile ? (
          <ReweighSheet
            {...formProps}
            borrowedFromName={weighing.lend.ownerName}
          />
        ) : (
          <ReweighPopover {...formProps} borrowed anchor={weighing.anchor} />
        ))}
    </>
  );
}

export { BorrowsContainer };
