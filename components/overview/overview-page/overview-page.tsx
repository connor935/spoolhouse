'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { markDried, setMeasuredWeight } from '@/app/actions/filaments';
import {
  approveLend,
  declineLend,
  markReturned,
  type MyLend,
} from '@/app/actions/lends';
import { ReweighPopover } from '@/components/inventory/reweigh-popover';
import { ReweighSheet } from '@/components/inventory/reweigh-sheet';
import { SpoolEditor } from '@/components/inventory/spool-editor';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { ActivityEvent } from '@/lib/activity';
import type { SpoolType } from '@/lib/db/schema';
import {
  computeFilamentLeft,
  EMPTY_THRESHOLD_G,
  formatWeight,
  lendUsageGrams,
  LOW_THRESHOLD_PCT,
  type MaterialInventory,
  type SpoolView,
} from '@/lib/filament';
import type { NavGroup } from '@/lib/nav';
import {
  dryingList,
  runningLow,
  stockSummary,
  stockValue,
} from '@/lib/overview';
import type { OverviewUsage } from '@/lib/usage-stats';

import {
  OverviewView,
  type OverviewBorrowRequest,
  type OverviewLend,
} from '../overview-view';

type OverviewPageProps = {
  userId: string;
  isAdmin: boolean;
  /** Server time of the render, so SSR and hydration agree. */
  now: Date;
  inventory: MaterialInventory[];
  usage: OverviewUsage;
  activity: ActivityEvent[];
  lends: MyLend[];
  groups: NavGroup[];
  spoolTypes: SpoolType[];
};

function ago(date: Date, now: Date): string {
  const minutes = Math.max(0, (now.getTime() - date.getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / (24 * 60))} d ago`;
}

// A borrowed spool isn't in the viewer's inventory; the lend row carries
// everything the re-weigh form needs (same maths as toSpoolView).
function borrowedSpoolView(l: MyLend): SpoolView {
  const left = computeFilamentLeft(
    l.measuredTotalWeightGrams,
    l.emptyWeightGrams
  );
  const percentLeft =
    l.fullFilamentWeightGrams > 0
      ? Math.min(100, (left / l.fullFilamentWeightGrams) * 100)
      : 0;
  const isEmpty = left <= EMPTY_THRESHOLD_G;
  return {
    id: l.lend.filamentId,
    materialId: '',
    spoolTypeId: '',
    spoolTypeLabel: '',
    emptyWeightGrams: l.emptyWeightGrams,
    fullFilamentWeightGrams: l.fullFilamentWeightGrams,
    measuredTotalWeightGrams: l.measuredTotalWeightGrams,
    filamentLeftGrams: left,
    percentLeft,
    isEmpty,
    isLow: !isEmpty && percentLeft <= LOW_THRESHOLD_PCT,
    lentToName: null,
    pricePaidCents: null,
    pricePerGramCents: null,
    valueLeftCents: null,
    purchasedAt: null,
    location: null,
    lastDriedAt: null,
    needsDrying: false,
    createdAt: l.lend.createdAt,
  };
}

function headerDateLine(
  now: Date,
  lastWeighing: Date | undefined,
  timeZone: string
): string {
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(now)
    .replace(',', '');
  if (!lastWeighing) return day;
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(lastWeighing);
  return `${day} · last weighing ${time}`;
}

/** `/` container: roll-ups, borrow actions, re-weigh, Mark dried, add spool. */
export function OverviewPage({
  userId,
  isAdmin,
  now,
  inventory,
  usage,
  activity,
  lends,
  groups,
  spoolTypes,
}: OverviewPageProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  // UTC for the server render and hydration, then the viewer's own zone.
  const [timeZone, setTimeZone] = useState('UTC');
  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  const [busy, setBusy] = useState(false);
  const [weigh, setWeigh] = useState<{
    spoolId: string;
    anchor: Element | null;
  } | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);

  const spoolNumbers = useMemo(
    () =>
      Object.fromEntries(
        inventory.flatMap((m) => m.spools.map((s, i) => [s.id, i + 1]))
      ),
    [inventory]
  );
  const locations = useMemo(
    () =>
      [
        ...new Set(
          inventory.flatMap((m) =>
            m.spools.flatMap((s) => (s.location ? [s.location] : []))
          )
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [inventory]
  );

  const incoming = lends
    .filter((l) => l.ownerId === userId && l.lend.status === 'requested')
    .sort(
      (a, b) => a.lend.requestedAt.getTime() - b.lend.requestedAt.getTime()
    );
  const first = incoming[0];
  const request: OverviewBorrowRequest | null = first
    ? {
        lendId: first.lend.id,
        spool: {
          materialName: first.materialName,
          number: spoolNumbers[first.lend.filamentId],
        },
        counterpartName: first.borrowerName,
        groupName: first.groupName,
        time: ago(first.lend.requestedAt, now),
        filamentLeftGrams: computeFilamentLeft(
          first.measuredTotalWeightGrams,
          first.emptyWeightGrams
        ),
      }
    : null;

  const active = lends.filter((l) => l.lend.status === 'active');
  const lendLines: OverviewLend[] = active.map((l) => {
    const out = l.ownerId === userId;
    return {
      lendId: l.lend.id,
      direction: out ? 'out' : 'in',
      spoolId: l.lend.filamentId,
      spool: {
        materialName: l.materialName,
        number: out ? spoolNumbers[l.lend.filamentId] : null,
      },
      counterpartName: out ? l.borrowerName : l.ownerName,
      since: l.lend.respondedAt ?? l.lend.requestedAt,
      usedGrams: lendUsageGrams({
        startWeightGrams: l.lend.startWeightGrams,
        endWeightGrams: l.lend.endWeightGrams,
        currentWeightGrams: l.measuredTotalWeightGrams,
      }),
    };
  });
  const weighLend = weigh
    ? active.find(
        (l) => l.ownerId !== userId && l.lend.filamentId === weigh.spoolId
      )
    : undefined;

  async function run(action: () => Promise<unknown>, ok: string, fail: string) {
    try {
      setBusy(true);
      await action();
      toast.success(ok);
      router.refresh();
      return true;
    } catch {
      toast.error(fail);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const weighProps = weighLend && {
    open: true,
    onOpenChange: (open: boolean) => {
      if (!open) setWeigh(null);
    },
    title: `Re-weigh ${weighLend.materialName}`,
    spool: borrowedSpoolView(weighLend),
    pending: busy,
    onSave: async (grams: number) => {
      const saved = await run(
        () => setMeasuredWeight(weighLend.lend.filamentId, grams),
        `Weighed — ${formatWeight(grams)} total`,
        'Could not save the weight. Please try again.'
      );
      if (saved) setWeigh(null);
    },
  };

  return (
    <>
      <OverviewView
        dateLine={headerDateLine(
          now,
          activity.find((e) => e.kind === 'weigh')?.at,
          timeZone
        )}
        summary={stockSummary(inventory)}
        value={stockValue(inventory)}
        usage={usage}
        runningLow={runningLow(inventory, usage.gramsPerDayByMaterial)}
        drying={dryingList(inventory, now)}
        activity={activity}
        spoolNumbers={spoolNumbers}
        now={now}
        timeZone={timeZone}
        request={request}
        requestCount={incoming.length}
        lends={lendLines}
        groups={groups}
        pending={busy}
        onAddSpool={() => {
          setEditorKey((k) => k + 1);
          setEditorOpen(true);
        }}
        onApprove={(id) =>
          run(() => approveLend(id), 'Request approved', 'Could not approve')
        }
        onDecline={(id) =>
          run(() => declineLend(id), 'Request declined', 'Could not decline')
        }
        onMarkReturned={(id) =>
          run(
            () => markReturned(id),
            'Marked as returned',
            'Could not mark the spool returned'
          )
        }
        onWeighBorrowed={(spoolId, anchor) => setWeigh({ spoolId, anchor })}
        onMarkDried={(spool) =>
          run(
            () => markDried(spool.id),
            'Marked as dried today',
            'Could not mark the spool as dried'
          )
        }
      />

      {weighProps &&
        weighLend &&
        (isMobile ? (
          <ReweighSheet
            {...weighProps}
            borrowedFromName={weighLend.ownerName}
          />
        ) : (
          <ReweighPopover
            {...weighProps}
            borrowed
            anchor={weigh?.anchor ?? null}
          />
        ))}

      {editorKey > 0 && (
        <SpoolEditor
          key={editorKey}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          spoolTypes={spoolTypes}
          locations={locations}
          addKicker="01 — Overview / New spool"
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}
