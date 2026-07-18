'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { computeFilamentLeft, formatWeight } from '@/lib/filament';
import { toast } from 'sonner';

// Cross-group borrow overview: incoming requests on my spools, my outgoing
// requests, active lends in both directions, and history.
// A spool you currently borrow: shows remaining amount and lets you re-weigh
// it (the borrower is the one printing with it).
function BorrowedRow({ lend: l }: { lend: MyLend }) {
  const router = useRouter();
  const [adjusting, setAdjusting] = useState(false);
  const [value, setValue] = useState(String(l.measuredTotalWeightGrams));
  const [pending, setPending] = useState(false);

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
    setPending(true);
    try {
      await setMeasuredWeight(l.lend.filamentId, grams);
      toast.success('Weight updated');
      setAdjusting(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update weight');
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
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
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-accent/40 text-accent shrink-0"
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
          >
            <Scale className="mr-1 h-4 w-4" />
            Re-weigh
          </Button>
        )}
      </div>
      {adjusting && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="1"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9 max-w-40 font-mono"
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
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);

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

  async function run(
    lendId: number,
    fn: (id: number) => Promise<void>,
    success: string
  ) {
    setPendingId(lendId);
    try {
      await fn(lendId);
      toast.success(success);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setPendingId(null);
    }
  }

  function spoolLine(l: MyLend) {
    return (
      <div className="min-w-0">
        <p className="truncate leading-tight font-medium">{l.materialName}</p>
        <p className="text-muted-foreground truncate text-xs">
          {l.materialManufacturer} · {l.groupName}
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
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {spoolLine(l)}
                  <Badge variant="secondary">{l.borrowerName}</Badge>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      run(l.lend.id, approveLend, 'Request approved')
                    }
                    disabled={pendingId === l.lend.id}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      run(l.lend.id, declineLend, 'Request declined')
                    }
                    disabled={pendingId === l.lend.id}
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
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {spoolLine(l)}
                  <Badge variant="outline" className="text-muted-foreground">
                    Awaiting {l.ownerName}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    run(l.lend.id, cancelLendRequest, 'Request cancelled')
                  }
                  disabled={pendingId === l.lend.id}
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
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {spoolLine(l)}
                  <Badge
                    variant="outline"
                    className="border-accent/40 text-accent"
                  >
                    Lent to {l.borrowerName}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    run(l.lend.id, markReturned, 'Marked as returned')
                  }
                  disabled={pendingId === l.lend.id}
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
                className="text-muted-foreground flex items-center justify-between gap-4 px-5 py-3 text-sm"
              >
                <span className="truncate">
                  {l.materialName} — {l.ownerName} → {l.borrowerName} (
                  {l.groupName})
                </span>
                <Badge
                  variant="outline"
                  className="text-muted-foreground shrink-0"
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
