import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatRunway } from '@/lib/consumption';
import type { UsageRow } from '@/lib/usage-stats';
import { cn } from '@/lib/utils';

export type RunwayRow = UsageRow & { filamentType?: string };

// Stock that runs out within this many days at the current pace is flagged.
const RUNWAY_WARN_DAYS = 30;
// The runway meter is full at a year ("Runway · 12 mo").
const RUNWAY_SCALE_DAYS = 365;
// Width of the "used" bar for the row that used the most.
const USED_BAR_MAX_PX = 100;

const gramsFormat = new Intl.NumberFormat('en-GB');
const grams = (g: number) => `${gramsFormat.format(Math.round(g))} g`;

// Days until the row runs out: 0 when already out, null without recent use.
const runwayDays = (r: UsageRow) => (r.leftGrams <= 0 ? 0 : r.forecastDays);

/** "Runs out first": shortest runway on top, rows without a forecast last. */
export function sortByRunway<T extends UsageRow>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      (runwayDays(a) ?? Infinity) - (runwayDays(b) ?? Infinity) ||
      b.usedLast90Grams - a.usedLast90Grams
  );
}

/**
 * Usage and runway per material or filament type (Statistics board,
 * sections 02 and 03). `kind="material"` adds the colour swatch, type tag,
 * a relative "used" bar and the runway meter; `kind="type"` is the compact
 * table under the stock composition bar.
 */
function RunwayTable({
  rows,
  kind = 'material',
  className,
}: {
  rows: RunwayRow[];
  kind?: 'material' | 'type';
  className?: string;
}) {
  const sorted = sortByRunway(rows);
  const maxUsed = Math.max(0, ...rows.map((r) => r.usedLast90Grams));
  const isMaterial = kind === 'material';

  return (
    <Table data-slot="runway-table" data-kind={kind} className={className}>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{isMaterial ? 'Material' : 'Type'}</TableHead>
          <TableHead scope="col" align={isMaterial ? undefined : 'right'}>
            Used · 90 d
          </TableHead>
          <TableHead scope="col" align="right">
            In stock
          </TableHead>
          <TableHead scope="col" align={isMaterial ? undefined : 'right'}>
            {isMaterial ? 'Runway · 12 mo' : 'Lasts'}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={4}
              className="text-muted-foreground py-6 text-center text-sm"
            >
              No filament in stock or used in the last 90 days.
            </TableCell>
          </TableRow>
        )}
        {sorted.map((r) => (
          <TableRow key={r.key} data-slot="runway-row">
            <TableCell>
              {isMaterial ? (
                <span className="flex items-center gap-2.5">
                  {r.color !== undefined && (
                    <span
                      aria-hidden
                      className="border-swatch-ring shadow-swatch size-3.5 shrink-0 rounded-full border"
                      style={{ backgroundColor: r.color ?? undefined }}
                    />
                  )}
                  <span className="display-name">{r.label}</span>
                  {r.filamentType && <Badge>{r.filamentType}</Badge>}
                </span>
              ) : (
                <Badge>{r.label}</Badge>
              )}
            </TableCell>
            <TableCell align={isMaterial ? undefined : 'right'}>
              {r.usedLast90Grams <= 0 ? (
                <span className="text-muted-foreground font-mono">—</span>
              ) : isMaterial ? (
                <span className="flex items-center gap-2.5">
                  <span className="min-w-[58px] shrink-0 font-mono whitespace-nowrap tabular-nums">
                    {grams(r.usedLast90Grams)}
                  </span>
                  <span
                    aria-hidden
                    data-slot="runway-used-bar"
                    className="bg-foreground h-1.5 opacity-85"
                    style={{
                      width: (r.usedLast90Grams / maxUsed) * USED_BAR_MAX_PX,
                    }}
                  />
                </span>
              ) : (
                <span className="font-mono">{grams(r.usedLast90Grams)}</span>
              )}
            </TableCell>
            <TableCell align="right" className="font-mono">
              {grams(r.leftGrams)}
            </TableCell>
            <TableCell align={isMaterial ? undefined : 'right'}>
              <Runway row={r} withMeter={isMaterial} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Runway({ row, withMeter }: { row: UsageRow; withMeter: boolean }) {
  const days = runwayDays(row);
  if (days === null) {
    return (
      <span className="kicker">{withMeter ? 'No recent use' : 'Idle'}</span>
    );
  }
  const short = days < RUNWAY_WARN_DAYS;
  const text = days === 0 ? 'Out of stock' : formatRunway(days);
  const label = short ? (
    <Badge variant="destructive">{text}</Badge>
  ) : (
    <span className="font-mono">{text}</span>
  );
  if (!withMeter) return label;
  // TODO(04b): swap for <Meter> once the inventory atoms land.
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        data-slot="runway-meter"
        className="bg-muted mask-segments relative h-2.5 w-[120px] shrink-0"
      >
        <i
          className={cn(
            'absolute inset-y-0 left-0',
            short ? 'bg-destructive' : 'bg-accent'
          )}
          style={{
            width: `${Math.min(100, (days / RUNWAY_SCALE_DAYS) * 100)}%`,
          }}
        />
      </span>
      {label}
    </span>
  );
}

export { RunwayTable };
