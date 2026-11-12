'use client';

import * as React from 'react';
import { PencilIcon, PlusIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMoney, type SpoolView } from '@/lib/filament';
import { cn } from '@/lib/utils';

import { Meter } from '../meter';
import { WeightDisplay } from '../weight-display';

/** "#01": spools are numbered oldest-first within their material. */
function spoolNumber(n: number): string {
  return `#${String(n).padStart(2, '0')}`;
}

const purchasedFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

type SpoolStatusTagsProps = {
  spool: SpoolView;
  requestedByName?: string | null;
  borrowedFromName?: string | null;
  /** Makes "Dry?" a button. Leave unset inside another interactive element. */
  onMarkDried?: () => void;
};

/**
 * A badge carrying user text (a name, a location): shrinks with its row and
 * ends in an ellipsis instead of overflowing the tile; the title has it all.
 */
function TextBadge({
  children,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Badge>, 'children'> & {
  children: string;
}) {
  return (
    <Badge
      title={children}
      className={cn('max-w-full min-w-0 shrink', className)}
      {...props}
    >
      <span className="min-w-0 truncate">{children}</span>
    </Badge>
  );
}

/** The status tags of one spool, shared by tiles and the compact mobile rows. */
function SpoolStatusTags({
  spool,
  requestedByName,
  borrowedFromName,
  onMarkDried,
}: SpoolStatusTagsProps) {
  const tags: React.ReactNode[] = [];
  if (spool.isEmpty) {
    tags.push(
      <Badge key="empty" variant="muted">
        Empty
      </Badge>
    );
  } else if (spool.isLow) {
    tags.push(
      <Badge key="low" variant="destructive">
        Low
      </Badge>
    );
  } else if (spool.percentLeft >= 100) {
    tags.push(
      <Badge key="full" variant="muted">
        Full
      </Badge>
    );
  }
  if (spool.needsDrying) {
    tags.push(
      onMarkDried ? (
        <Badge
          key="dry"
          variant="accent"
          render={<button type="button" onClick={onMarkDried} />}
          title="Not dried for a while — mark as dried"
        >
          Dry?
        </Badge>
      ) : (
        <Badge key="dry" variant="accent" title="Not dried for a while">
          Dry?
        </Badge>
      )
    );
  }
  if (spool.lentToName) {
    tags.push(
      <TextBadge key="lent" variant="accent">
        {`Lent · ${spool.lentToName}`}
      </TextBadge>
    );
  }
  if (requestedByName) {
    tags.push(
      <TextBadge key="req" variant="muted">
        {`Req · ${requestedByName}`}
      </TextBadge>
    );
  }
  if (borrowedFromName) {
    tags.push(
      <TextBadge key="borrowed" variant="default">
        {`Borrowed · ${borrowedFromName}`}
      </TextBadge>
    );
  }
  if (tags.length === 0) return null;
  return (
    <span
      data-slot="spool-status-tags"
      className="flex min-w-0 flex-wrap justify-end gap-1"
    >
      {tags}
    </span>
  );
}

type SpoolTileProps = Omit<React.ComponentProps<'div'>, 'onSelect'> &
  Omit<SpoolStatusTagsProps, 'spool'> & {
    spool: SpoolView;
    /** Position in the material's oldest-first list, 1-based. */
    number: number;
    /** Highlighted, e.g. while its re-weigh popover is open. */
    selected?: boolean;
    /** Adds the spool-type / price / purchase line (material detail page). */
    details?: boolean;
    /** Click anywhere on the tile, usually to re-weigh. */
    onSelect?: () => void;
    /** Accessible name of the tile's main action. */
    selectLabel?: string;
    onEdit?: () => void;
  };

/**
 * One physical spool (`.slot`): number, location, weight, meter and status
 * tags. The whole tile is clickable via a full-size button laid over it;
 * "Dry?" and the edit button sit above that layer, so they never trigger
 * `onSelect`.
 */
function SpoolTile({
  className,
  spool,
  number,
  selected,
  details,
  onSelect,
  selectLabel,
  onEdit,
  requestedByName,
  borrowedFromName,
  onMarkDried,
  ...props
}: SpoolTileProps) {
  const id = React.useId();
  const label = spoolNumber(number);
  const meta = [
    spool.pricePaidCents !== null && formatMoney(spool.pricePaidCents),
    spool.purchasedAt &&
      `bought ${purchasedFormat.format(new Date(spool.purchasedAt))}`,
  ].filter(Boolean);

  return (
    <div
      data-slot="spool-tile"
      data-selected={selected || undefined}
      className={cn(
        'border-ink bg-card text-card-foreground relative flex w-[200px] flex-col gap-2 rounded-[4px] border pt-2 pr-2 pb-2.5 pl-2.5 transition-[border-color,box-shadow]',
        onSelect && 'hover:border-accent',
        selected && 'border-accent shadow-[0_0_0_1px_var(--color-accent)]',
        details && 'w-[228px]',
        className
      )}
      {...props}
    >
      {onSelect && (
        <button
          type="button"
          aria-label={selectLabel ?? `Re-weigh spool ${label}`}
          aria-describedby={`${id}-summary`}
          onClick={onSelect}
          className="focus-visible:ring-accent absolute inset-0 cursor-pointer rounded-[3px] outline-none focus-visible:ring-2"
        />
      )}
      <div className="flex h-6 items-center gap-1.5">
        <span className="text-muted-foreground shrink-0 font-mono text-xs font-medium">
          {label}
        </span>
        {spool.location && (
          <TextBadge variant="inverted">{spool.location}</TextBadge>
        )}
        {onEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit spool ${label}`}
            onClick={onEdit}
            className="relative z-10 ml-auto shrink-0"
          >
            <PencilIcon />
          </Button>
        )}
      </div>
      <div
        id={`${id}-summary`}
        className="flex items-center justify-between gap-1.5"
      >
        <WeightDisplay grams={spool.filamentLeftGrams} className="shrink-0" />
        {/* Above the tile button for "Dry?"; static badges let clicks through. */}
        <span className="pointer-events-none relative z-10 min-w-0 [&_button]:pointer-events-auto">
          <SpoolStatusTags
            spool={spool}
            requestedByName={requestedByName}
            borrowedFromName={borrowedFromName}
            onMarkDried={onMarkDried}
          />
        </span>
      </div>
      <Meter
        value={spool.percentLeft}
        tone={spool.isLow || spool.isEmpty ? 'low' : 'default'}
        aria-label={`Spool ${label} filament left`}
      />
      {details && (
        <p className="fine border-border border-t border-dashed pt-1.5">
          {spool.spoolTypeLabel}
          {meta.length > 0 && (
            <>
              <br />
              {meta.join(' · ')}
            </>
          )}
        </p>
      )}
    </div>
  );
}

/** Dashed "+ Spool" placeholder at the end of a material's tile row. */
function AddSpoolTile({
  className,
  children = 'Spool',
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      data-slot="add-spool-tile"
      className={cn(
        'border-ink/60 text-muted-foreground hover:border-accent-ink hover:text-accent-ink focus-visible:ring-accent flex min-h-[86px] w-[200px] cursor-pointer items-center justify-center gap-1.5 rounded-[4px] border border-dashed bg-transparent transition-[color,border-color] outline-none focus-visible:ring-2 [&_svg]:size-4',
        className
      )}
      {...props}
    >
      <PlusIcon aria-hidden />
      <span className="kicker text-current">{children}</span>
    </button>
  );
}

export { AddSpoolTile, SpoolStatusTags, SpoolTile, spoolNumber, TextBadge };
