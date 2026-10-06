import { formatDays } from '@/lib/consumption';
import { formatWeight } from '@/lib/filament';
import type { UsageRow } from '@/lib/usage-stats';
import { cn } from '@/lib/utils';

// Stock that runs out within this many days at the current pace is flagged.
const RUNWAY_WARN_DAYS = 30;

export function UsageTable({ rows }: { rows: UsageRow[] }) {
  return (
    <div className="border-border bg-card overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground text-left text-xs">
          <tr className="border-border border-b">
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 text-right font-medium whitespace-nowrap">
              Used (90 d)
            </th>
            <th className="px-4 py-2 text-right font-medium whitespace-nowrap">
              In stock
            </th>
            <th className="px-4 py-2 text-right font-medium whitespace-nowrap">
              Lasts about
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {rows.map((r) => {
            const short =
              r.forecastDays !== null && r.forecastDays < RUNWAY_WARN_DAYS;
            return (
              <tr key={r.key}>
                <td className="px-4 py-2">
                  <span className="flex items-center gap-2">
                    {r.color !== undefined && (
                      <span
                        className="border-border h-3 w-3 shrink-0 rounded-full border"
                        style={{ backgroundColor: r.color ?? undefined }}
                        aria-hidden
                      />
                    )}
                    <span>{r.label}</span>
                  </span>
                </td>
                <td className="px-4 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                  {formatWeight(r.usedLast90Grams)}
                </td>
                <td className="px-4 py-2 text-right font-mono whitespace-nowrap tabular-nums">
                  {formatWeight(r.leftGrams)}
                </td>
                <td
                  className={cn(
                    'px-4 py-2 text-right whitespace-nowrap',
                    short && 'text-destructive font-medium'
                  )}
                >
                  {r.leftGrams <= 0
                    ? 'Out of stock'
                    : r.forecastDays === null
                      ? '—'
                      : formatDays(r.forecastDays)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
