import { BarChart3 } from 'lucide-react';
import { getInventory } from '@/app/actions/filaments';
import { PageShell } from '@/components/layout/page-shell';
import { MonthlyUsageChart } from '@/components/stats/monthly-usage-chart';
import { UsageTable } from '@/components/stats/usage-table';
import { requireUser } from '@/lib/auth-session';
import { formatMoney, formatWeight, groupInventory } from '@/lib/filament';
import { getUsageStats } from '@/lib/usage-stats';

export const dynamic = 'force-dynamic';

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border-border bg-card flex flex-col gap-1 rounded-lg border p-4">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-mono text-xl font-semibold tabular-nums">
        {value}
      </span>
      {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
    </div>
  );
}

export default async function StatsPage() {
  const user = await requireUser();
  const inventory = groupInventory(await getInventory());
  const stats = await getUsageStats(user.id, inventory);
  const anyUsage = stats.monthly.some((m) => m.grams > 0);
  const anyCost = stats.monthly.some((m) => m.costCents > 0);

  return (
    <PageShell
      title="Statistics"
      description="Usage is worked out from your re-weighs: every drop in weight between two weighings counts as used filament."
    >
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile
          label="Used, last 30 days"
          value={formatWeight(stats.usedLast30Grams)}
        />
        <Tile
          label="Average per month"
          value={formatWeight(Math.round(stats.avgPerMonthGrams))}
        />
        <Tile
          label="Cost, last 30 days"
          value={formatMoney(stats.costLast30Cents)}
          hint={anyCost ? undefined : 'Add prices to your spools'}
        />
        <Tile
          label="Stock value"
          value={formatMoney(stats.stockValueCents)}
          hint={`${stats.pricedSpools} of ${stats.stockedSpools} spools priced`}
        />
      </div>

      {!anyUsage ? (
        <div className="border-border bg-card/50 mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
          <BarChart3 className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            No usage yet. Re-weigh your spools now and then and this page fills
            up with monthly usage, costs and how long your stock lasts.
          </p>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="mb-3 font-semibold">Monthly usage</h2>
            <MonthlyUsageChart months={stats.monthly} showCost={anyCost} />
          </section>
          <section className="mt-8">
            <h2 className="mb-1 font-semibold">By material</h2>
            <p className="text-muted-foreground mb-3 text-sm">
              Materials used in the last 90 days; the ones running out first are
              on top.
            </p>
            <UsageTable rows={stats.byMaterial} />
          </section>
          <section className="mt-8">
            <h2 className="mb-3 font-semibold">By filament type</h2>
            <UsageTable rows={stats.byType} />
          </section>
        </>
      )}
    </PageShell>
  );
}
