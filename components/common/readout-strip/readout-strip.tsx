import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type ReadoutStripProps = {
  children: ReactNode;
  /** Names the region; the boards call it "Key figures". */
  label?: string;
  /**
   * 2px ink rule on top, for a strip directly under a PageHeader with
   * `rule={false}` (Overview, Statistics).
   */
  ruled?: boolean;
  className?: string;
};

// Design language: `.ro` in .claude/design/spoolhouse.css.
function ReadoutStrip({
  children,
  label = 'Key figures',
  ruled = false,
  className,
}: ReadoutStripProps) {
  return (
    <section
      aria-label={label}
      data-slot="readout-strip"
      className={cn(
        'border-ink grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] border-b',
        ruled && 'border-t-2',
        className
      )}
    >
      {children}
    </section>
  );
}

type ReadoutTone = 'default' | 'positive' | 'negative';

const toneClass: Record<ReadoutTone, string> = {
  default: '',
  positive: 'text-accent',
  negative: 'text-destructive',
};

type ReadoutProps = {
  label: ReactNode;
  value: ReactNode;
  /** Small muted suffix: "kg", ".60", "/ 19". See `readoutParts`. */
  unit?: ReactNode;
  /** Sub-line under the value; a string is set as a kicker, nodes as-is. */
  sub?: ReactNode;
  /** Colours a string sub-line, e.g. a usage delta. */
  tone?: ReadoutTone;
  /** Beside the value, e.g. a sparkline. */
  aside?: ReactNode;
  /** `big` is the 58px hero number of the Overview/Statistics boards. */
  size?: 'default' | 'big';
  /** Makes the whole readout a link (Overview readouts open their page). */
  href?: string;
  className?: string;
};

function Readout({
  label,
  value,
  unit,
  sub,
  tone = 'default',
  aside,
  size = 'default',
  href,
  className,
}: ReadoutProps) {
  const number = (
    <span className={size === 'big' ? 'display-big' : 'display-num'}>
      {value}
      {unit && (
        <small
          className={cn(
            'text-muted-foreground ml-[3px] font-medium',
            size === 'big' ? 'text-base' : 'text-[15px]'
          )}
        >
          {unit}
        </small>
      )}
    </span>
  );

  const body = (
    <>
      <span className="kicker">{label}</span>
      {aside ? (
        <span className="flex items-end justify-between gap-2.5">
          {number}
          {aside}
        </span>
      ) : (
        number
      )}
      {sub != null &&
        (typeof sub === 'string' ? (
          <span
            data-tone={tone}
            className={cn('kicker tracking-[0.04em]', toneClass[tone])}
          >
            {sub}
          </span>
        ) : (
          sub
        ))}
    </>
  );

  const cls = cn(
    'flex min-w-0 flex-col gap-2.5 border-l border-border px-5 pt-4 pb-[18px] text-foreground first:border-l-0 first:pl-0',
    className
  );

  return href ? (
    <Link
      href={href}
      data-slot="readout"
      className={cn(
        cls,
        'hover:bg-accent/5 focus-visible:ring-ring outline-none focus-visible:ring-2'
      )}
    >
      {body}
    </Link>
  ) : (
    <div data-slot="readout" className={cls}>
      {body}
    </div>
  );
}

/**
 * Splits an already formatted figure into the big part and the small suffix
 * the boards set in `<small>`: a trailing unit ("8.09 kg" → 8.09 + kg, from
 * `formatWeight`) or, failing that, the decimals ("€214.60" → €214 + .60,
 * from `formatMoney`). Anything else stays whole.
 */
function readoutParts(formatted: string): { value: string; unit?: string } {
  const unit = /^(.*\d)\s+(\D+)$/.exec(formatted);
  if (unit) return { value: unit[1], unit: unit[2] };
  const decimals = /^(.*\d)([.,]\d+)$/.exec(formatted);
  if (decimals) return { value: decimals[1], unit: decimals[2] };
  return { value: formatted };
}

export { Readout, ReadoutStrip, readoutParts };
