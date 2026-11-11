'use client';

import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatDays } from '@/lib/consumption';
import type { MaterialInventory, SpoolView } from '@/lib/filament';
import { cn } from '@/lib/utils';

import { Meter } from '../meter';
import {
  AddSpoolTile,
  SpoolStatusTags,
  SpoolTile,
  spoolNumber,
  TextBadge,
} from '../spool-tile';
import { Swatch } from '../swatch';
import { WeightDisplay } from '../weight-display';

type MaterialBlockProps = Omit<React.ComponentProps<'section'>, 'onSelect'> & {
  inventory: MaterialInventory;
  /**
   * `shelf`: desktop row, header beside wrapping tiles (Inventory board).
   * `card`: mobile card whose header collapses a list of compact spool rows
   * (MobileInventory board).
   */
  layout?: 'shelf' | 'card';
  /** Days until this material runs out (`forecastDays()`), null = no usage yet. */
  forecastDays?: number | null;
  /** Hides spools (e.g. empty ones) without renumbering the rest. */
  filter?: (spool: SpoolView) => boolean;
  selectedSpoolId?: string | null;
  /** Pending borrow requests by spool id → requester name. */
  requestedBy?: Readonly<Record<string, string>>;
  /** Card layout only: start collapsed. */
  defaultOpen?: boolean;
  onOpenMaterial?: () => void;
  onSelectSpool?: (spool: SpoolView) => void;
  onMarkDried?: (spool: SpoolView) => void;
  onEditSpool?: (spool: SpoolView) => void;
  onAddSpool?: () => void;
  /** Receives each tile's element, e.g. to anchor a re-weigh popover. */
  tileRef?: (spoolId: string, element: HTMLDivElement | null) => void;
};

function spoolCount(n: number) {
  return `${n} spool${n === 1 ? '' : 's'}`;
}

/**
 * One material with its spools: swatch, name, type, manufacturer, total,
 * spool count and runway, then a tile per spool.
 */
function MaterialBlock({
  className,
  inventory,
  layout = 'shelf',
  forecastDays,
  filter,
  selectedSpoolId,
  requestedBy,
  defaultOpen = true,
  onOpenMaterial,
  onSelectSpool,
  onMarkDried,
  onEditSpool,
  onAddSpool,
  tileRef,
  ...props
}: MaterialBlockProps) {
  const { material, spools, totalLeftGrams } = inventory;
  const numbered = spools
    .map((spool, i) => ({ spool, number: i + 1 }))
    .filter(({ spool }) => !filter || filter(spool));
  const summary = [
    spoolCount(spools.length),
    forecastDays != null && `~${formatDays(forecastDays)}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const title = `${material.name} ${material.filamentType}`;

  const nameRow = (
    <span className="flex items-center gap-2">
      <span className="display-name text-[19px] transition-colors">
        {material.name}
      </span>
      <Badge>{material.filamentType}</Badge>
    </span>
  );

  if (layout === 'card') {
    return (
      <Collapsible defaultOpen={defaultOpen}>
        <section
          data-slot="material-block"
          data-layout="card"
          aria-label={title}
          className={cn(
            'border-ink bg-card text-card-foreground relative rounded-[4px] border',
            className
          )}
          {...props}
        >
          <CollapsibleTrigger className="group/trigger before:border-ink before:bg-background focus-visible:ring-accent flex w-full cursor-pointer items-center gap-3 rounded-[4px] py-3 pr-3 pl-[26px] text-left outline-none before:absolute before:top-[21px] before:left-2.5 before:size-[7px] before:rounded-full before:border focus-visible:ring-2">
            <Swatch size="lg" color={material.color} decorative />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              {nameRow}
              <span className="kicker tracking-[0.05em]">
                {material.manufacturer} · {summary}
              </span>
            </span>
            <WeightDisplay grams={totalLeftGrams} size="block" />
            <ChevronDownIcon
              aria-hidden
              className="text-muted-foreground size-4 shrink-0 transition-transform group-data-panel-open/trigger:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div
              aria-hidden
              className="border-ink border-t border-dashed opacity-45"
            />
            <ul className="px-3 pb-0.5">
              {numbered.map(({ spool, number }) => (
                <li
                  key={spool.id}
                  className="border-border border-t first:border-t-0"
                >
                  <SpoolRow
                    spool={spool}
                    number={number}
                    requestedByName={requestedBy?.[spool.id]}
                    onSelect={
                      onSelectSpool ? () => onSelectSpool(spool) : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </section>
      </Collapsible>
    );
  }

  const header = (
    <>
      <Swatch size="xl" color={material.color} decorative />
      <span className="flex min-w-0 flex-col gap-1.5">
        {nameRow}
        <span className="kicker tracking-[0.05em]">
          {material.manufacturer}
        </span>
        <span className="flex items-baseline gap-2">
          <WeightDisplay grams={totalLeftGrams} size="block" />
          <span className="kicker">{summary}</span>
        </span>
      </span>
    </>
  );
  const headerClass =
    'group/mat relative flex shrink-0 basis-[280px] items-start gap-3 rounded-[4px] py-0.5 pr-2 pl-5 text-left before:absolute before:top-[13px] before:left-0.5 before:size-[7px] before:rounded-full before:border before:border-ink before:bg-background';

  return (
    <section
      data-slot="material-block"
      data-layout="shelf"
      aria-label={title}
      className={cn(
        'border-border flex flex-wrap gap-x-7 gap-y-3.5 border-t py-[18px]',
        className
      )}
      {...props}
    >
      {onOpenMaterial ? (
        <button
          type="button"
          onClick={onOpenMaterial}
          aria-label={`Open ${title}`}
          className={cn(
            headerClass,
            'focus-visible:ring-accent [&_.display-name]:group-hover/mat:text-accent cursor-pointer outline-none focus-visible:ring-2'
          )}
        >
          {header}
        </button>
      ) : (
        <div className={headerClass}>{header}</div>
      )}
      <div className="flex min-w-0 flex-1 flex-wrap content-start gap-2.5">
        {numbered.map(({ spool, number }) => (
          <SpoolTile
            key={spool.id}
            ref={tileRef ? (el) => tileRef(spool.id, el) : undefined}
            spool={spool}
            number={number}
            selected={spool.id === selectedSpoolId}
            requestedByName={requestedBy?.[spool.id]}
            onSelect={onSelectSpool ? () => onSelectSpool(spool) : undefined}
            onMarkDried={onMarkDried ? () => onMarkDried(spool) : undefined}
            onEdit={onEditSpool ? () => onEditSpool(spool) : undefined}
          />
        ))}
        {onAddSpool && (
          <AddSpoolTile
            aria-label={`Add a spool of ${title}`}
            onClick={onAddSpool}
          />
        )}
      </div>
    </section>
  );
}

/** Compact mobile row (`.sp`): number, weight, location, tags, meter. */
function SpoolRow({
  spool,
  number,
  requestedByName,
  onSelect,
}: {
  spool: SpoolView;
  number: number;
  requestedByName?: string;
  onSelect?: () => void;
}) {
  const label = spoolNumber(number);
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground w-[26px] shrink-0 font-mono text-xs">
          {label}
        </span>
        <WeightDisplay
          grams={spool.filamentLeftGrams}
          className="min-w-[58px] shrink-0 font-mono text-sm font-semibold"
        />
        {spool.location && (
          // Capped rather than shrinking first, so a long tag can't squeeze it.
          <TextBadge variant="inverted" className="max-w-[40%] shrink-0">
            {spool.location}
          </TextBadge>
        )}
        <SpoolStatusTags spool={spool} requestedByName={requestedByName} />
      </span>
      <Meter
        value={spool.percentLeft}
        tone={spool.isLow || spool.isEmpty ? 'low' : 'default'}
        aria-label={`Spool ${label} filament left`}
      />
    </>
  );
  const rowClass = 'flex w-full flex-col gap-[7px] py-2.5 text-left';
  return onSelect ? (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Re-weigh spool ${label}`}
      className={cn(
        rowClass,
        'focus-visible:ring-accent cursor-pointer rounded-[3px] outline-none focus-visible:ring-2'
      )}
    >
      {content}
    </button>
  ) : (
    <div className={rowClass}>{content}</div>
  );
}

export { MaterialBlock };
