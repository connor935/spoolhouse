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
  const max = Math.max(...months.map((m) => m.grams), 1);
  const peak = months.reduce((a, b) => (b.grams > a.grams ? b : a));
  const describe = (m: (typeof months)[number]) =>
    `${monthYear.format(new Date(`${m.month}-01T00:00:00Z`))}: ${formatWeight(m.grams)}${showCost ? ` · ${formatMoney(m.costCents)}` : ''}`;

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="flex h-40 items-end gap-1" aria-hidden>
        {months.map((m) => (
          <div
            key={m.month}
            className="group relative flex h-full flex-1 items-end"
            title={describe(m)}
          >
            {m === peak && m.grams > 0 && (
              <span className="text-muted-foreground absolute -top-0.5 left-1/2 -translate-x-1/2 font-mono text-[10px] whitespace-nowrap">
                {formatWeight(m.grams)}
              </span>
            )}
            <div
              className="bg-accent group-hover:bg-accent/80 w-full rounded-t-[4px]"
              style={{
                height: `${(m.grams / max) * 85}%`,
                minHeight: m.grams > 0 ? 2 : 0,
              }}
            />
          </div>
        ))}
      </div>
      <div className="border-border mt-1 flex gap-1 border-t pt-1" aria-hidden>
        {months.map((m) => (
          <span
            key={m.month}
            className="text-muted-foreground flex-1 text-center text-[10px]"
          >
            {monthLabel.format(new Date(`${m.month}-01T00:00:00Z`))}
          </span>
        ))}
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
