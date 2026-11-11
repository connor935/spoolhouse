import type * as React from 'react';

import {
  lendSpoolName,
  shortDate,
  type LendSpool,
} from '@/components/borrows/lend-spool-label';
import { Meter } from '@/components/inventory/meter';
import { Swatch } from '@/components/inventory/swatch';
import { WeightDisplay } from '@/components/inventory/weight-display';
import { Badge } from '@/components/ui/badge';
import { formatWeight } from '@/lib/filament';
import { cn } from '@/lib/utils';

type LendLineProps = {
  /** `out`: your spool, lent to someone. `in`: someone's spool, with you. */
  direction: 'out' | 'in';
  spool: LendSpool;
  /** The borrower for `out`, the owner for `in`. */
  counterpartName: string;
  /** When the lend was approved. */
  since: Date;
  /** Grams used since approval (`lendUsageGrams`); null when unknown. */
  usedGrams?: number | null;
  groupName?: string;
  /** Borrowed spools show what's left, since the borrower re-weighs them. */
  filamentLeftGrams?: number;
  percentLeft?: number;
  /** "Mark returned" for `out`, "Weigh" for `in`. */
  action?: React.ReactNode;
  className?: string;
};

/**
 * One active lend (Borrows 03 + 04): direction tag, spool, counterpart,
 * since / usage line and an action slot. Borrowed spools add a meter and the
 * weight left, and say who ends the lend: only the owner marks it returned.
 */
function LendLine({
  direction,
  spool,
  counterpartName,
  since,
  usedGrams,
  groupName,
  filamentLeftGrams,
  percentLeft,
  action,
  className,
}: LendLineProps) {
  const out = direction === 'out';
  const name = lendSpoolName(spool);
  const firstName = counterpartName.trim().split(/\s+/)[0] || counterpartName;
  const meta = [
    `since ${shortDate(since)}`,
    usedGrams != null && usedGrams > 0 && `−${formatWeight(usedGrams)} so far`,
    groupName,
    !out && `only ${firstName} can end the lend`,
  ].filter(Boolean);

  return (
    <div
      data-slot="lend-line"
      data-direction={direction}
      className={cn(
        'border-border flex flex-wrap items-center gap-3 border-t py-3 first:border-t-0 first:pt-0 sm:flex-nowrap',
        className
      )}
    >
      <Badge variant={out ? 'accent' : 'default'}>{out ? 'Out' : 'In'}</Badge>
      {!out && <Swatch color={spool.color} decorative />}
      <span className="flex min-w-0 flex-1 basis-48 flex-col gap-[3px]">
        <span className="truncate text-sm">
          <span className="font-medium">{name}</span>{' '}
          <span className="text-muted-foreground">
            <span aria-hidden>{out ? '→' : '←'}</span>
            <span className="sr-only">
              {out ? 'lent to' : 'borrowed from'}
            </span>{' '}
            {counterpartName}
          </span>
        </span>
        <span className="kicker">{meta.join(' · ')}</span>
      </span>
      {!out && percentLeft !== undefined && (
        <Meter
          value={percentLeft}
          aria-label={`${name} filament left`}
          className="w-40 max-sm:hidden"
        />
      )}
      {!out && filamentLeftGrams !== undefined && (
        <WeightDisplay
          grams={filamentLeftGrams}
          size="block"
          className="w-20 justify-end text-2xl"
        />
      )}
      {action}
    </div>
  );
}

export { LendLine };
