import { formatMoney, formatWeight } from '@/lib/filament';

const monthLabel = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  timeZone: 'UTC',
});
const monthYear = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

// Round axis ticks (steps of 1/2/2.5/5 × 10ⁿ), about four intervals, the
// top tick at or above the peak.
function axisTicks(max: number): number[] {
  const raw = Math.max(max, 4) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((f) => f * pow).find((s) => s >= raw) ?? 10 * pow;
  const ticks = [0];
  while (ticks[ticks.length - 1] < max) ticks.push(ticks.length * step);
  if (ticks.length === 1) ticks.push(step);
  return ticks;
}

// "1.5 kg", not formatWeight's "1.50 kg" — tick values are round anyway.
function tickLabel(grams: number): string {
  if (grams >= 1000) return `${Number((grams / 1000).toFixed(2))} kg`;
  return `${grams} g`;
}

// Single-series column chart of grams used per month (last 12 months). Plain
// HTML so it themes with the app tokens; each column carries its exact value
// as a hover tooltip and in the screen-reader table below.
export function MonthlyUsageChart({
  months,
  showCost,
}: {
  months: { month: string; grams: number; costCents: number }[];
  showCost: boolean;
}) {
  const ticks = axisTicks(Math.max(...months.map((m) => m.grams)));
  const top = ticks[ticks.length - 1];
  const describe = (m: (typeof months)[number]) =>
    `${monthYear.format(new Date(`${m.month}-01T00:00:00Z`))}: ${formatWeight(m.grams)}${showCost ? ` · ${formatMoney(m.costCents)}` : ''}`;

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="flex gap-2" aria-hidden>
        <div className="relative h-40 w-12 shrink-0">
          {ticks.map((t) => (
            <span
              key={t}
              className="text-muted-foreground absolute right-0 translate-y-1/2 font-mono text-[10px] whitespace-nowrap"
              style={{ bottom: `${(t / top) * 100}%` }}
            >
              {tickLabel(t)}
            </span>
          ))}
        </div>
        <div className="relative flex h-40 flex-1 items-end gap-1">
          {ticks.slice(1).map((t) => (
            <div
              key={t}
              className="border-border/60 absolute inset-x-0 border-t border-dashed"
              style={{ bottom: `${(t / top) * 100}%` }}
            />
          ))}
          {months.map((m) => (
            <div
              key={m.month}
              className="group relative flex h-full flex-1 items-end"
              title={describe(m)}
            >
              <div
                className="bg-accent group-hover:bg-accent/80 w-full rounded-t-[4px]"
                style={{
                  height: `${(m.grams / top) * 100}%`,
                  minHeight: m.grams > 0 ? 2 : 0,
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2" aria-hidden>
        <div className="w-12 shrink-0" />
        <div className="border-border mt-1 flex flex-1 gap-1 border-t pt-1">
          {months.map((m) => (
            <span
              key={m.month}
              className="text-muted-foreground flex-1 text-center text-[10px]"
            >
              {monthLabel.format(new Date(`${m.month}-01T00:00:00Z`))}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Filament used per month</caption>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <td>{describe(m)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
