'use client';

import * as React from 'react';

import { wholePercentages } from '@/lib/chart';
import { formatWeight } from '@/lib/filament';
import { cn } from '@/lib/utils';

export type StockShare = { type: string; grams: number };

// Fills in fixed order, largest share first (Statistics board, section 03):
// accent, primary, hatched ink, then muted — the slot "Other" folds into.
const FILLS = [
  { fill: 'bg-accent', text: 'text-accent-foreground' },
  { fill: 'bg-primary', text: 'text-primary-foreground' },
  {
    fill: 'bg-[repeating-linear-gradient(135deg,var(--color-foreground)_0_1.5px,transparent_1.5px_5px)] shadow-[inset_0_0_0_1px_var(--color-ink)]',
    text: 'text-foreground',
  },
  {
    fill: 'bg-muted shadow-[inset_0_0_0_1px_var(--color-border)]',
    text: 'text-foreground',
  },
];
// A share this wide fits its "PLA 74%" label inside the segment.
const INLINE_LABEL_MIN_PERCENT = 20;

const gramsFormat = new Intl.NumberFormat('en-GB');

/**
 * 100 % stacked bar of the stock by filament type, with a legend carrying
 * every percentage (they always add up to 100). At most four segments:
 * beyond that the smallest types fold into "Other".
 */
function StockCompositionBar({
  data,
  title = 'Stock composition',
  className,
}: {
  data: StockShare[];
  title?: string;
  className?: string;
}) {
  const [active, setActive] = React.useState<number | null>(null);
  const tooltipId = React.useId();

  const sorted = data
    .filter((d) => d.grams > 0)
    .sort((a, b) => b.grams - a.grams);
  const segments =
    sorted.length > FILLS.length
      ? [
          ...sorted.slice(0, FILLS.length - 1),
          {
            type: 'Other',
            grams: sorted
              .slice(FILLS.length - 1)
              .reduce((s, d) => s + d.grams, 0),
          },
        ]
      : sorted;
  const total = segments.reduce((s, d) => s + d.grams, 0);

  if (total <= 0) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <span className="kicker">{title}</span>
        <div className="border-border text-muted-foreground flex h-7 items-center justify-center rounded-[3px] border border-dashed text-xs">
          No filament in stock
        </div>
      </div>
    );
  }

  const percents = wholePercentages(segments.map((s) => s.grams));
  const grams = (i: number) => `${gramsFormat.format(segments[i].grams)} g`;

  return (
    <div
      data-slot="stock-composition-bar"
      className={cn('flex flex-col gap-2', className)}
    >
      <span className="kicker">
        {title} · {formatWeight(total)}
      </span>
      <div
        role="group"
        aria-label={title}
        className="relative flex h-7 gap-0.5"
      >
        {segments.map((s, i) => (
          <div
            key={s.type}
            role="img"
            tabIndex={0}
            aria-label={`${s.type}: ${grams(i)}, ${percents[i]}%`}
            aria-describedby={active === i ? tooltipId : undefined}
            data-slot="stock-composition-segment"
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive((a) => (a === i ? null : a))}
            onFocus={() => setActive(i)}
            onBlur={() => setActive((a) => (a === i ? null : a))}
            className={cn(
              'focus-visible:ring-ring focus-visible:ring-offset-background relative flex min-w-0.5 items-center pl-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              FILLS[i].fill
            )}
            style={{ flex: `${s.grams} 1 0` }}
          >
            {percents[i] >= INLINE_LABEL_MIN_PERCENT && (
              <span
                aria-hidden
                className={cn(
                  'font-mono text-[11px] font-semibold whitespace-nowrap',
                  FILLS[i].text
                )}
              >
                {s.type} {percents[i]}%
              </span>
            )}
            {active === i && (
              <span
                id={tooltipId}
                role="tooltip"
                className="bg-foreground text-background pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 -translate-x-1/2 rounded-[3px] px-[9px] py-1.5 font-mono text-xs font-semibold whitespace-nowrap tabular-nums"
              >
                {s.type} · {grams(i)} · {percents[i]}%
              </span>
            )}
          </div>
        ))}
      </div>
      <ul
        aria-label={`${title} legend`}
        className="kicker flex flex-wrap gap-x-4 gap-y-1 tracking-[0.04em]"
      >
        {segments.map((s, i) => (
          <li key={s.type} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn('size-2.5 shrink-0', FILLS[i].fill)}
            />
            <span className="text-foreground">{s.type}</span>
            <span className="tabular" data-slot="stock-composition-percent">
              {percents[i]}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { StockCompositionBar };
