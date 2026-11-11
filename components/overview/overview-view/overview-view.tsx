'use client';

import * as React from 'react';
import Link from 'next/link';
import { PackageIcon, PlusIcon } from 'lucide-react';

import { LendLine } from '@/components/borrows/lend-line';
import { LendRequestCard } from '@/components/borrows/lend-request-card';
import type { LendSpool } from '@/components/borrows/lend-spool-label';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import {
  Readout,
  ReadoutStrip,
  readoutParts,
} from '@/components/common/readout-strip';
import { SectionHeader } from '@/components/common/section-header';
import { spoolNumber } from '@/components/inventory/spool-tile';
import { Swatch } from '@/components/inventory/swatch';
import { WeightDisplay } from '@/components/inventory/weight-display';
import { UsageBarChart } from '@/components/stats/usage-bar-chart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { activityTime, type ActivityEvent } from '@/lib/activity';
import { formatDays } from '@/lib/consumption';
import { formatMoney, formatWeight, type SpoolView } from '@/lib/filament';
import type { NavGroup } from '@/lib/nav';
import type {
  DryingRow,
  RunningLowRow,
  StockSummary,
  StockValue,
  UsageDelta,
} from '@/lib/overview';
import { cn } from '@/lib/utils';

import { ActivityList, type ActivityEntry } from '../activity-list';

export type OverviewBorrowRequest = {
  lendId: string;
  spool: LendSpool;
  counterpartName: string;
  groupName: string;
  time: string;
  filamentLeftGrams?: number;
};

export type OverviewLend = {
  lendId: string;
  /** `out`: the viewer's spool with someone; `in`: borrowed by the viewer. */
  direction: 'out' | 'in';
  spoolId: string;
  spool: LendSpool;
  counterpartName: string;
  since: Date;
  usedGrams?: number | null;
};

type OverviewViewProps = {
  /** "Tue 10 Nov 2026 · last weighing 14:02". */
  dateLine?: string;
  summary: StockSummary;
  value: StockValue;
  usage: {
    delta: UsageDelta;
    monthly: { month: string; grams: number; costCents: number }[];
  };
  runningLow: RunningLowRow[];
  drying: DryingRow[];
  activity: ActivityEvent[];
  /** The viewer's spools → their number within the material. */
  spoolNumbers: Readonly<Record<string, number>>;
  now: Date;
  timeZone: string;
  /** The oldest open request on the viewer's spools. */
  request: OverviewBorrowRequest | null;
  requestCount: number;
  lends: OverviewLend[];
  /** Empty: not in any group, so no Borrows / Groups sections. */
  groups: NavGroup[];
  /** Disables the borrow actions while one runs. */
  pending?: boolean;
  onAddSpool: () => void;
  onApprove: (lendId: string) => void;
  onDecline: (lendId: string) => void;
  onMarkReturned?: (lendId: string) => void;
  /** The clicked button anchors the desktop re-weigh popover. */
  onWeighBorrowed: (spoolId: string, anchor: HTMLElement) => void;
  onMarkDried: (spool: SpoolView) => void;
  className?: string;
};

function Section({
  index,
  title,
  aside,
  className,
  children,
}: {
  index: string;
  title: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className={cn('min-w-0', className)}>
      <SectionHeader id={id} index={index} title={title} aside={aside} />
      {children}
    </section>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}

function signed(grams: number): string {
  if (grams === 0) return '±0';
  return `${grams < 0 ? '−' : '+'}${Math.abs(Math.round(grams))}`;
}

/** One feed line's wording, from the viewer's side of the event. */
function activityContent(
  e: ActivityEvent,
  spoolNumbers: Readonly<Record<string, number>>
): { kind: ActivityEntry['kind']; content: React.ReactNode } {
  const n = spoolNumbers[e.spoolId];
  const spool = (
    <strong>
      {n ? `${e.materialName} ${spoolNumber(n)}` : e.materialName}
    </strong>
  );
  if (e.kind === 'weigh') {
    return {
      kind: 'weigh',
      content: (
        <>
          {e.byName ? (
            <>
              <strong>{e.byName}</strong> weighed{' '}
            </>
          ) : (
            'Weighed '
          )}
          {spool} —{' '}
          <span className="font-mono">{formatWeight(e.leftGrams)}</span>
          {e.deltaGrams !== null && (
            <span className="text-muted-foreground font-mono">
              {' '}
              ({signed(e.deltaGrams)})
            </span>
          )}
        </>
      ),
    };
  }
  const other = <strong>{e.otherName}</strong>;
  const owner = e.role === 'owner';
  const text: Record<typeof e.event, React.ReactNode> = owner
    ? {
        requested: (
          <>
            {other} requested {spool}
          </>
        ),
        approved: (
          <>
            You lent {spool} to {other}
          </>
        ),
        declined: (
          <>
            You declined {other}’s request for {spool}
          </>
        ),
        returned: (
          <>
            {spool} is back from {other}
          </>
        ),
      }
    : {
        requested: (
          <>
            You requested {spool} from {other}
          </>
        ),
        approved: (
          <>
            {other} approved your request for {spool}
          </>
        ),
        declined: (
          <>
            {other} declined your request for {spool}
          </>
        ),
        returned: (
          <>
            {other} marked {spool} returned
          </>
        ),
      };
  return {
    kind: e.event === 'requested' ? 'request' : 'borrow',
    content: text[e.event],
  };
}

/**
 * `/` (Main + OverviewDark boards): key figures, then 02 Running low,
 * 03 Monthly usage, 04 Recent activity, 05 Borrows, 06 Needs drying and
 * 07 Groups. A user without spools gets the onboarding empty state.
 */
function OverviewView({
  dateLine,
  summary,
  value,
  usage,
  runningLow,
  drying,
  activity,
  spoolNumbers,
  now,
  timeZone,
  request,
  requestCount,
  lends,
  groups,
  pending,
  onAddSpool,
  onApprove,
  onDecline,
  onMarkReturned,
  onWeighBorrowed,
  onMarkDried,
  className,
}: OverviewViewProps) {
  const header = (
    <PageHeader
      index="01"
      kicker="Overview"
      meta={dateLine}
      title="Overview"
      rule={summary.total === 0}
      actions={
        <Button variant="accent" onClick={onAddSpool}>
          <PlusIcon aria-hidden />
          Add spool
        </Button>
      }
    />
  );

  if (summary.total === 0) {
    return (
      <div
        data-slot="overview-view"
        className={cn('flex flex-col gap-6', className)}
      >
        {header}
        <EmptyState
          icon={<PackageIcon />}
          kicker="Overview · new user"
          title="Your shelf is empty"
          description="Add a spool, weigh it now and then, and Spoolhouse tracks what's left, what you use and what it costs."
          steps={[
            'Pick a material from the catalog',
            'Weigh the full spool',
            'Re-weigh after printing',
          ]}
          action={
            <Button variant="accent" onClick={onAddSpool}>
              Add your first spool
            </Button>
          }
        />
      </div>
    );
  }

  const left = readoutParts(formatWeight(summary.leftGrams));
  const used = readoutParts(formatWeight(usage.delta.last30Grams));
  const money = readoutParts(formatMoney(value.cents));
  const { deltaPct } = usage.delta;
  const total12 = usage.monthly.reduce((s, m) => s + m.grams, 0);

  const feed: ActivityEntry[] = activity.map((e) => ({
    id: e.id,
    time: activityTime(e.at, now, timeZone),
    dateTime: e.at.toISOString(),
    unread: e.kind === 'lend' && e.pending,
    ...activityContent(e, spoolNumbers),
  }));

  return (
    <div
      data-slot="overview-view"
      className={cn('flex flex-col gap-9', className)}
    >
      <div className="flex flex-col gap-0">
        {header}
        <ReadoutStrip ruled className="mt-5">
          <Readout
            label="Spools in stock"
            value={summary.inStock}
            unit={`/ ${summary.total}`}
            sub={`${summary.low} low · ${summary.empty} empty`}
            size="big"
            href="/inventory"
          />
          <Readout
            label="Filament left"
            value={left.value}
            unit={left.unit}
            sub={`${summary.materials} materials · ${summary.types} types`}
            size="big"
            href="/inventory"
          />
          <Readout
            label="Used · 30 days"
            value={used.value}
            unit={used.unit}
            sub={
              deltaPct === null
                ? 'no previous 30 days'
                : `${deltaPct < 0 ? '−' : '+'}${Math.abs(deltaPct)} % vs. prev. 30 days`
            }
            size="big"
            href="/stats"
          />
          <Readout
            label="Stock value"
            value={money.value}
            unit={money.unit}
            sub={`${value.priced}/${value.stocked} priced`}
            size="big"
            href="/stats"
          />
        </ReadoutStrip>
      </div>

      <div className="grid gap-9 lg:grid-cols-2">
        <Section
          index="02"
          title="Running low"
          aside={<Link href="/inventory">Inventory →</Link>}
        >
          {runningLow.length === 0 ? (
            <Muted>Nothing is running low.</Muted>
          ) : (
            <ul>
              {runningLow.map((row) => {
                const one = row.spools.length === 1 ? row.spools[0] : null;
                return (
                  <li
                    key={row.material.id}
                    className="border-border flex items-center gap-3 border-t py-2.5 first:border-t-0 first:pt-0"
                  >
                    <Swatch color={row.material.color} decorative />
                    <span className="kicker w-10 shrink-0">
                      {one ? spoolNumber(one.number) : `×${row.spools.length}`}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">
                        {row.material.name}
                      </span>
                      <span className="kicker">
                        {[one?.spool.location, row.material.filamentType]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <WeightDisplay grams={row.leftGrams} />
                    <span className="flex w-28 flex-col items-end gap-1">
                      {row.isLow ? (
                        <Badge variant="destructive">Low</Badge>
                      ) : (
                        <Badge variant="muted">Forecast</Badge>
                      )}
                      {row.forecastDays !== null && (
                        <span className="kicker">
                          ~{formatDays(row.forecastDays)} left
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section
          index="03"
          title="Monthly usage"
          aside={<Link href="/stats">Statistics →</Link>}
        >
          <p className="kicker mb-3">
            {formatWeight(total12)} in 12 months · Ø{' '}
            {formatWeight(total12 / 12)}
          </p>
          <UsageBarChart
            data={usage.monthly}
            variant="compact"
            monthLabels="narrow"
          />
        </Section>

        <Section
          index="04"
          title="Recent activity"
          aside={<Link href="/notifications">All →</Link>}
        >
          <ActivityList items={feed} />
        </Section>

        {groups.length > 0 && (
          <Section
            index="05"
            title="Borrows"
            aside={<Link href="/borrows">Open →</Link>}
          >
            <div className="flex flex-col gap-4">
              {request && (
                <LendRequestCard
                  direction="incoming"
                  spool={request.spool}
                  counterpartName={request.counterpartName}
                  groupName={request.groupName}
                  time={request.time}
                  filamentLeftGrams={request.filamentLeftGrams}
                  pending={pending}
                  onApprove={() => onApprove(request.lendId)}
                  onDecline={() => onDecline(request.lendId)}
                />
              )}
              {requestCount > 1 && (
                <p className="kicker">
                  +{requestCount - 1} more request
                  {requestCount === 2 ? '' : 's'}
                </p>
              )}
              {lends.length > 0 ? (
                <div>
                  {lends.map((l) => (
                    <LendLine
                      key={l.lendId}
                      direction={l.direction}
                      spool={l.spool}
                      counterpartName={l.counterpartName}
                      since={l.since}
                      usedGrams={l.usedGrams}
                      action={
                        l.direction === 'in' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) =>
                              onWeighBorrowed(l.spoolId, e.currentTarget)
                            }
                          >
                            Weigh
                          </Button>
                        ) : onMarkReturned ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            onClick={() => onMarkReturned(l.lendId)}
                          >
                            Mark returned
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                !request && <Muted>Nothing lent or borrowed right now.</Muted>
              )}
            </div>
          </Section>
        )}

        <Section index="06" title="Needs drying">
          {drying.length === 0 ? (
            <Muted>Everything is dry enough.</Muted>
          ) : (
            <ul>
              {drying.map((row) => {
                const label = `${spoolNumber(row.number)} ${row.material.name}`;
                return (
                  <li
                    key={row.spool.id}
                    className="border-border flex items-center gap-3 border-t py-2.5 first:border-t-0 first:pt-0"
                  >
                    <Swatch color={row.material.color} decorative />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{label}</span>
                      <span className="kicker">
                        {row.material.filamentType} ·{' '}
                        {row.neverDried
                          ? 'never dried'
                          : `dried ${row.daysSinceDried} d ago`}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Mark dried ${label}`}
                      onClick={() => onMarkDried(row.spool)}
                    >
                      Mark dried
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {groups.length > 0 && (
          <Section
            index="07"
            title="Groups"
            aside={<Link href="/groups">All →</Link>}
          >
            <ul>
              {groups.map((g) => (
                <li
                  key={g.id}
                  className="border-border border-t first:border-t-0"
                >
                  <Link
                    href={`/groups/${g.id}`}
                    className="hover:text-accent flex items-baseline justify-between gap-3 py-2.5"
                  >
                    <span className="display-name text-[19px]">{g.name}</span>
                    <span className="kicker">{g.sharedCount} shared</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

export { OverviewView };
