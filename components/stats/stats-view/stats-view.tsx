'use client';

import * as React from 'react';
import { BarChart3Icon } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import {
  Readout,
  ReadoutStrip,
  readoutParts,
} from '@/components/common/readout-strip';
import { SectionHeader } from '@/components/common/section-header';
import { RunwayTable } from '@/components/stats/runway-table';
import { StockCompositionBar } from '@/components/stats/stock-composition-bar';
import {
  UsageBarChart,
  type UsageMetric,
} from '@/components/stats/usage-bar-chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatMoney, formatWeight } from '@/lib/filament';
import type { UsageStats } from '@/lib/usage-stats';

export type StatsViewProps = Omit<UsageStats, 'trackedSince'>;

const monthRange = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const monthLabel = (month: string) =>
  monthRange.format(new Date(`${month}-01T00:00:00Z`));

function Section({
  index,
  title,
  aside,
  children,
}: {
  index: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="min-w-0">
      <SectionHeader id={id} index={index} title={title} aside={aside} />
      {children}
    </section>
  );
}

/**
 * `/stats` (Statistics board): key figures, then 01 Monthly usage with a
 * grams/cost toggle, 02 By material (runs out first) and 03 By filament type
 * (stock composition + table).
 */
function StatsView({
  delta,
  costLast30Cents,
  avgPerMonthGrams,
  stockValueCents,
  pricedSpools,
  stockedSpools,
  monthly,
  byMaterial,
  byType,
  stockByType,
}: StatsViewProps) {
  const [metric, setMetric] = React.useState<UsageMetric>('grams');
  const anyUsage = monthly.some((m) => m.grams > 0);
  const anyCost = monthly.some((m) => m.costCents > 0);

  const used = readoutParts(formatWeight(delta.last30Grams));
  const avg = readoutParts(formatWeight(Math.round(avgPerMonthGrams)));
  const cost = readoutParts(formatMoney(costLast30Cents));
  const value = readoutParts(formatMoney(stockValueCents));
  const { deltaPct } = delta;
  const total12 =
    metric === 'cost'
      ? formatMoney(monthly.reduce((s, m) => s + m.costCents, 0))
      : formatWeight(monthly.reduce((s, m) => s + m.grams, 0));

  return (
    <div data-slot="stats-view" className="flex flex-col gap-9">
      <div className="flex flex-col">
        <PageHeader
          index="05"
          kicker="Statistics"
          meta="Usage = Σ weight decrease between weighings"
          title="Statistics"
          rule={false}
        />
        <ReadoutStrip ruled className="mt-5">
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
          />
          <Readout
            label="Average / month"
            value={avg.value}
            unit={avg.unit}
            sub="last 12 months"
            size="big"
          />
          <Readout
            label="Cost · 30 days"
            value={cost.value}
            unit={cost.unit}
            sub={anyCost ? 'priced spools only' : 'add prices to your spools'}
            size="big"
          />
          <Readout
            label="Stock value"
            value={value.value}
            unit={value.unit}
            sub={`${pricedSpools}/${stockedSpools} priced`}
            size="big"
          />
        </ReadoutStrip>
      </div>

      <Section
        index="01"
        title="Monthly usage"
        aside={
          anyUsage && (
            <ToggleGroup
              aria-label="Chart metric"
              value={[metric]}
              onValueChange={(next) =>
                next[0] && setMetric(next[0] as UsageMetric)
              }
            >
              <ToggleGroupItem value="grams">Grams</ToggleGroupItem>
              <ToggleGroupItem value="cost">Cost</ToggleGroupItem>
            </ToggleGroup>
          )
        }
      >
        {anyUsage ? (
          <div className="flex flex-col gap-3">
            <p className="kicker">
              <span className="text-foreground">{total12}</span>{' '}
              {monthLabel(monthly[0].month)} –{' '}
              {monthLabel(monthly[monthly.length - 1].month)}
            </p>
            <UsageBarChart data={monthly} metric={metric} showCost={anyCost} />
          </div>
        ) : (
          <EmptyState
            icon={<BarChart3Icon />}
            title="No usage yet"
            description="Re-weigh your spools now and then and this page fills up with monthly usage, costs and how long your stock lasts."
          />
        )}
      </Section>

      <Section
        index="02"
        title="By material"
        aside={<span className="kicker">Runs out first ↑</span>}
      >
        <div className="overflow-x-auto">
          <RunwayTable rows={byMaterial} />
        </div>
      </Section>

      <Section index="03" title="By filament type">
        <div className="flex flex-col gap-5">
          <StockCompositionBar data={stockByType} />
          <div className="overflow-x-auto">
            <RunwayTable rows={byType} kind="type" />
          </div>
        </div>
      </Section>
    </div>
  );
}

export { StatsView };
