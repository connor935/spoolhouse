'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Scale, X } from 'lucide-react';
import { setMeasuredWeight } from '@/app/actions/filaments';
import {
  approveLend,
  cancelLendRequest,
  declineLend,
  markReturned,
  type MyLend,
} from '@/app/actions/lends';
import {
  computeFilamentLeft,
  formatMoney,
  formatWeight,
  lendUsageGrams,
  pricePerGramCents,
} from '@/lib/filament';
import { useAsyncAction, useKeyedAsyncAction } from '@/hooks/use-async-action';
import { LEND_TOAST } from '@/lib/lend-toast';
import { toast } from 'sonner';

// "240 g used ≈ €4.80" for an active or returned lend; null when the lend
// predates weight snapshots.
function usageText(l: MyLend): string | null {
  const grams = lendUsageGrams({
    startWeightGrams: l.lend.startWeightGrams,
    endWeightGrams: l.lend.endWeightGrams,
    currentWeightGrams: l.measuredTotalWeightGrams,
  });
  if (grams === null) return null;
  const perGram = pricePerGramCents(l);
  return `${formatWeight(grams)} used${perGram === null ? '' : ` ≈ ${formatMoney(grams * perGram)}`}`;
}

// Cross-group borrow overview: incoming requests on my spools, my outgoing
// requests, active lends in both directions, and history.
// A spool you currently borrow: shows remaining amount and lets you re-weigh
// it (the borrower is the one printing with it).
function BorrowedRow({ lend: l }: { lend: MyLend }) {
  const [adjusting, setAdjusting] = useState(false);
  const [value, setValue] = useState(String(l.measuredTotalWeightGrams));
  const { pending, run } = useAsyncAction();

  const measured = Number.parseInt(value, 10);
  const previewLeft = !Number.isNaN(measured)
    ? computeFilamentLeft(measured, l.emptyWeightGrams)
    : null;

  async function save() {
    const grams = Number.parseInt(value, 10);
    if (Number.isNaN(grams) || grams < l.emptyWeightGrams) {
      toast.error(
        `Measured weight can't be less than the empty spool weight (${l.emptyWeightGrams} g)`
      );
      return;
    }
    await run(() => setMeasuredWeight(l.lend.filamentId, grams), {
      success: 'Weight updated',
      errorFallback: 'Could not update weight',
      onSuccess: () => setAdjusting(false),
    });
  }

  return (
    <li className="flex flex-col gap-3 px-5 py-4">
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex w-full items-center justify-between gap-3 md:min-w-0">
          <div className="min-w-0">
            <p className="truncate leading-tight font-medium">
              {l.materialName}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {l.materialManufacturer} · {l.groupName} ·{' '}
              {formatWeight(
                computeFilamentLeft(
                  l.measuredTotalWeightGrams,
                  l.emptyWeightGrams
                )
              )}{' '}
              left
              {usageText(l) && <> · {usageText(l)}</>}
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-accent-ink/40 text-accent-ink shrink-0"
          >
            From {l.ownerName}
          </Badge>
        </div>
        {!adjusting && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setValue(String(l.measuredTotalWeightGrams));
              setAdjusting(true);
            }}
            className="w-full md:w-fit"
          >
            <Scale className="mr-1 h-4 w-4" />
            Re-weigh
          </Button>
        )}
      </div>
      {adjusting && (
        <div className="flex w-full flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="1"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9 flex-1 font-mono md:max-w-40"
              aria-label="Measured total weight in grams"
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={save}
              disabled={pending}
            >
              <Check className="h-4 w-4" />
              <span className="sr-only">Save</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0"
              onClick={() => setAdjusting(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>
          <span className="text-muted-foreground text-xs">
            {previewLeft !== null
              ? `= ${formatWeight(previewLeft)} filament left`
              : 'Enter the scale value (g)'}
          </span>
        </div>
      )}
    </li>
  );
}

export function BorrowsPanel({
  lends,
  currentUserId,
}: {
  lends: MyLend[];
  currentUserId: string;
}) {
  const { pendingKey: pendingId, run } = useKeyedAsyncAction<string>();

  const incoming = lends.filter(
    (l) => l.lend.status === 'requested' && l.ownerId === currentUserId
  );
  const outgoing = lends.filter(
    (l) => l.lend.status === 'requested' && l.ownerId !== currentUserId
  );
  const lentOut = lends.filter(
    (l) => l.lend.status === 'active' && l.ownerId === currentUserId
  );
  const borrowed = lends.filter(
    (l) => l.lend.status === 'active' && l.ownerId !== currentUserId
  );
  const history = lends.filter(
    (l) => l.lend.status === 'returned' || l.lend.status === 'declined'
  );

  function spoolLine(l: MyLend) {
    return (
      <div className="min-w-0">
        <p className="truncate leading-tight font-medium">{l.materialName}</p>
        <p className="text-muted-foreground truncate text-xs">
          {l.materialManufacturer} · {l.groupName}
          {l.lend.status === 'active' && usageText(l) && <> · {usageText(l)}</>}
        </p>
      </div>
    );
  }

  const empty =
    incoming.length === 0 &&
    outgoing.length === 0 &&
    lentOut.length === 0 &&
    borrowed.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {empty && (
        <div className="border-border bg-card/50 text-muted-foreground rounded-lg border border-dashed px-6 py-10 text-center text-sm">
          No open borrows — request a spool from a group tab and it will show up
          here.
        </div>
      )}

      {incoming.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Requests for your spools</h2>
          <ul className="divide-border border-border bg-card divide-y rounded-lg border">
            {incoming.map((l) => (
              <li
                key={l.lend.id}
                className="flex flex-col items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex w-full items-center justify-between gap-3 md:min-w-0">
                  {spoolLine(l)}
                  <Badge variant="secondary">{l.borrowerName}</Badge>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      run(l.lend.id, () => approveLend(l.lend.id), {
                        success: LEND_TOAST.approved,
                      })
                    }
                    disabled={pendingId === l.lend.id}
                    className="w-full md:w-fit"
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      run(l.lend.id, () => declineLend(l.lend.id), {
                        success: LEND_TOAST.declined,
                      })
                    }
                    disabled={pendingId === l.lend.id}
                    className="w-full md:w-fit"
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Your requests</h2>
          <ul className="divide-border border-border bg-card divide-y rounded-lg border">
            {outgoing.map((l) => (
              <li
                key={l.lend.id}
                className="flex flex-col items-center justify-between gap-4 px-5 py-4 md:flex-row"
              >
                <div className="flex w-full items-center justify-between gap-3 md:min-w-0">
                  {spoolLine(l)}
                  <Badge variant="outline" className="text-muted-foreground">
                    Awaiting {l.ownerName}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    run(l.lend.id, () => cancelLendRequest(l.lend.id), {
                      success: LEND_TOAST.cancelled,
                    })
                  }
                  disabled={pendingId === l.lend.id}
                  className="w-full md:w-fit"
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lentOut.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Lent out</h2>
          <ul className="divide-border border-border bg-card divide-y rounded-lg border">
            {lentOut.map((l) => (
              <li
                key={l.lend.id}
                className="flex flex-col items-center justify-between gap-4 px-5 py-4 md:flex-row"
              >
                <div className="flex w-full items-center justify-between gap-3 md:min-w-0">
                  {spoolLine(l)}
                  <Badge
                    variant="outline"
                    className="border-accent-ink/40 text-accent-ink"
                  >
                    Lent to {l.borrowerName}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    run(l.lend.id, () => markReturned(l.lend.id), {
                      success: LEND_TOAST.returned,
                    })
                  }
                  disabled={pendingId === l.lend.id}
                  className="w-full md:w-fit"
                >
                  Mark returned
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {borrowed.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Borrowed by you</h2>
          <ul className="divide-border border-border bg-card divide-y rounded-lg border">
            {borrowed.map((l) => (
              <BorrowedRow key={l.lend.id} lend={l} />
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">History</h2>
          <ul className="divide-border border-border bg-card divide-y rounded-lg border">
            {history.slice(0, 15).map((l) => (
              <li
                key={l.lend.id}
                className="text-muted-foreground flex flex-col items-center justify-between gap-4 px-5 py-3 text-sm md:flex-row"
              >
                <span className="truncate">
                  {l.materialName} — {l.ownerName} → {l.borrowerName} (
                  {l.groupName})
                  {l.lend.status === 'returned' && usageText(l) && (
                    <> · {usageText(l)}</>
                  )}
                </span>
                <Badge
                  variant="outline"
                  className="text-muted-foreground w-full shrink-0 md:w-fit"
                >
                  {l.lend.status === 'returned' ? 'Returned' : 'Declined'}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
