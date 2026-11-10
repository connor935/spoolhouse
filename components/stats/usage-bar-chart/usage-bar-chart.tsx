'use client';

import * as React from 'react';

import { valueTicks } from '@/lib/chart';
import { CURRENCY, formatMoney, formatWeight } from '@/lib/filament';
import { cn } from '@/lib/utils';

export type UsageMonth = { month: string; grams: number; costCents: number };
export type UsageMetric = 'grams' | 'cost';

// en-US month names: "Sep", not en-GB "Sept" (the boards' abbreviations).
const monthFormats = {
  short: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }),
  narrow: new Intl.DateTimeFormat('en-US', {
    month: 'narrow',
    timeZone: 'UTC',
  }),
  long: new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }),
  readout: new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }),
};
const gramsFormat = new Intl.NumberFormat('en-GB');

const monthDate = (month: string) => new Date(`${month}-01T00:00:00Z`);
const grams = (g: number) => `${gramsFormat.format(Math.round(g))} g`;

// Axis labels stay unitless ("0.5", "1.0") — the caption names the unit.
function axisFormat(metric: UsageMetric, ticks: number[]) {
  const step = ticks[0];
  if (metric === 'cost') {
    const money = new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: CURRENCY,
      maximumFractionDigits: step % 100 === 0 ? 0 : 2,
    });
    return {
      unit: 'cost / month',
      format: (t: number) => money.format(t / 100),
    };
  }
  if (ticks[ticks.length - 1] < 1000)
    return { unit: 'g / month', format: (t: number) => String(t) };
  const digits = step % 1000 === 0 ? 0 : step % 100 === 0 ? 1 : 2;
  return {
    unit: 'kg / month',
    format: (t: number) => (t / 1000).toFixed(digits),
  };
}

/**
 * Monthly usage columns (`.cb`, Statistics/Overview/Material detail boards).
 * The current month — the last entry — is hatched as "month to date". Each
 * column is keyboard focusable (one tab stop, arrow keys move) and shows a
 * readout on hover and focus; its aria-label carries the same text, so the
 * readout never gates a value.
 */
function UsageBarChart({
  data,
  metric = 'grams',
  variant = 'full',
  monthLabels = 'short',
  monthToDate = true,
  showCost = true,
  className,
}: {
  /** Oldest first, current month last — `UsageStats.monthly`. */
  data: UsageMonth[];
  metric?: UsageMetric;
  /** `compact`: no axis labels or caption, peak value on its column. */
  variant?: 'full' | 'compact';
  monthLabels?: 'short' | 'narrow';
  /** Hatch the last column as the incomplete current month. */
  monthToDate?: boolean;
  /** Include cost in the readout (off when no spool has a price). */
  showCost?: boolean;
  className?: string;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const [focusIndex, setFocusIndex] = React.useState(data.length - 1);
  const bars = React.useRef<(HTMLDivElement | null)[]>([]);
  const tooltipId = React.useId();

  const valueOf = (m: UsageMonth) =>
    metric === 'cost' ? m.costCents : m.grams;
  const max = Math.max(0, ...data.map(valueOf));
  const compact = variant === 'compact';

  if (max <= 0) {
    return (
      <div
        data-slot="usage-bar-chart-empty"
        className={cn(
          'border-border text-muted-foreground flex flex-col items-center justify-center gap-1 rounded-[4px] border border-dashed p-6 text-center text-sm',
          compact ? 'min-h-[120px]' : 'min-h-[200px]',
          className
        )}
      >
        <span className="text-foreground font-medium">
          {metric === 'cost' ? 'No priced usage yet' : 'No usage recorded yet'}
        </span>
        <span className="fine">
          {metric === 'cost'
            ? 'Add a price to a spool to see what your prints cost.'
            : 'Usage shows up once a spool has been re-weighed.'}
        </span>
      </div>
    );
  }

  const { ticks, top } = valueTicks(max);
  const axis = axisFormat(metric, ticks);
  const current = monthToDate ? data.length - 1 : -1;
  const peak = data.findIndex((m) => valueOf(m) === max);
  const pct = (v: number) => `${(v / top) * 100}%`;
  const formatValue = (v: number) =>
    metric === 'cost' ? formatMoney(v) : formatWeight(v);

  // Values lead: the selected metric first.
  const readout = (m: UsageMonth) => {
    const parts = [grams(m.grams)];
    if (showCost || metric === 'cost') parts.push(formatMoney(m.costCents));
    if (metric === 'cost') parts.reverse();
    return parts.join(' · ');
  };
  const label = (m: UsageMonth, i: number) =>
    `${monthFormats.long.format(monthDate(m.month))}: ${readout(m)}${i === current ? ' (month to date)' : ''}`;
  const range = `${monthFormats.readout.format(monthDate(data[0].month))} to ${monthFormats.readout.format(monthDate(data[data.length - 1].month))}`;
  const summary = `Monthly filament ${metric === 'cost' ? 'cost' : 'usage'}, ${range}. Peak ${formatValue(max)} in ${monthFormats.long.format(monthDate(data[peak].month))}.`;

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const to =
      e.key === 'ArrowRight'
        ? i + 1
        : e.key === 'ArrowLeft'
          ? i - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? data.length - 1
              : null;
    if (to === null) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(data.length - 1, to));
    setFocusIndex(next);
    bars.current[next]?.focus();
  };

  return (
    <div
      data-slot="usage-bar-chart"
      data-variant={variant}
      className={cn(
        'flex flex-col',
        compact ? 'gap-2' : 'gap-2.5 pl-12',
        className
      )}
    >
      <div
        role="group"
        aria-label={summary}
        className={cn(
          'border-ink relative flex items-end border-b-2',
          compact ? 'h-[150px] gap-1.5' : 'h-[260px] gap-2'
        )}
      >
        {ticks.map((t) => (
          <div
            key={t}
            aria-hidden
            data-slot="usage-bar-chart-gridline"
            className="border-border pointer-events-none absolute inset-x-0 border-t border-dotted"
            style={{ bottom: pct(t) }}
          >
            {!compact && (
              <span className="text-muted-foreground absolute top-[-7px] -left-[46px] w-[38px] text-right font-mono text-[10.5px] font-medium tabular-nums">
                {axis.format(t)}
              </span>
            )}
          </div>
        ))}
        {data.map((m, i) => {
          const value = valueOf(m);
          const isActive = active === i;
          return (
            <div
              key={m.month}
              className="relative flex h-full flex-1 flex-col justify-end"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive((a) => (a === i ? null : a))}
            >
              {isActive && (
                <div
                  id={tooltipId}
                  role="tooltip"
                  className="bg-foreground text-background pointer-events-none absolute left-1/2 z-10 flex -translate-x-1/2 flex-col gap-0.5 rounded-[3px] px-[9px] py-1.5 whitespace-nowrap"
                  style={{ bottom: `calc(${pct(value)} + 12px)` }}
                >
                  <span className="font-mono text-[10.5px] tracking-[0.08em] uppercase opacity-70">
                    {monthFormats.readout.format(monthDate(m.month))}
                    {i === current && ' · to date'}
                  </span>
                  <span className="font-mono text-[13px] font-semibold tabular-nums">
                    {readout(m)}
                  </span>
                </div>
              )}
              {compact && i === peak && active === null && (
                <span
                  aria-hidden
                  data-slot="usage-bar-chart-peak"
                  className="text-foreground absolute left-1/2 -translate-x-1/2 font-mono text-[11px] font-semibold whitespace-nowrap tabular-nums"
                  style={{ bottom: `calc(${pct(value)} + 4px)` }}
                >
                  {formatValue(value)}
                </span>
              )}
              <div
                ref={(el) => {
                  bars.current[i] = el;
                }}
                role="img"
                tabIndex={i === focusIndex ? 0 : -1}
                aria-label={label(m, i)}
                aria-describedby={isActive ? tooltipId : undefined}
                data-slot="usage-bar"
                data-current={i === current || undefined}
                onFocus={() => {
                  setActive(i);
                  setFocusIndex(i);
                }}
                onBlur={() => setActive((a) => (a === i ? null : a))}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={cn(
                  'outline-none',
                  i === current ? 'hatch-accent' : 'bg-accent',
                  isActive &&
                    'shadow-[0_0_0_2px_var(--color-background),0_0_0_3px_var(--color-foreground)]'
                )}
                style={{ height: pct(value), minHeight: value > 0 ? 2 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div
        aria-hidden
        className={cn(
          'kicker flex text-center tracking-[0.04em]',
          compact ? 'gap-1.5' : 'gap-2'
        )}
      >
        {data.map((m, i) => (
          <span
            key={m.month}
            className={cn(
              'flex-1',
              active === i && 'text-foreground font-semibold'
            )}
          >
            {monthFormats[monthLabels].format(monthDate(m.month))}
            {i === current && '*'}
          </span>
        ))}
      </div>
      {!compact && (
        <div className="kicker tracking-[0.04em]">
          {axis.unit}
          {current >= 0 && ' · * month to date (hatched)'}
        </div>
      )}
    </div>
  );
}

export { UsageBarChart };
