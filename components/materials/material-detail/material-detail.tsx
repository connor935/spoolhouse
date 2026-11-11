'use client';

import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { type Crumb, PageHeader } from '@/components/common/page-header';
import {
  Readout,
  ReadoutStrip,
  readoutParts,
} from '@/components/common/readout-strip';
import { SectionHeader } from '@/components/common/section-header';
import { StatusBadge } from '@/components/common/status-badge';
import { AddSpoolTile, SpoolTile } from '@/components/inventory/spool-tile';
import { Swatch } from '@/components/inventory/swatch';
import { MaterialGroupStockTable } from '@/components/materials/material-group-stock-table';
import { PropertyList } from '@/components/materials/property-list';
import { UsageBarChart } from '@/components/stats/usage-bar-chart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { forecastDays, formatDays, formatRunway } from '@/lib/consumption';
import type { Material } from '@/lib/db/schema';
import {
  formatMoney,
  formatWeight,
  type MaterialStockSummary,
  type SpoolView,
} from '@/lib/filament';
import type { MaterialUsageHistory } from '@/lib/usage-stats';

type MaterialDetailProps = {
  material: Material;
  /** Kicker trail before the material's name: where the viewer came from. */
  breadcrumb?: Crumb[];
  isAdmin: boolean;
  /** The viewer submitted it: may edit while pending or rejected. */
  own: boolean;
  /** Spools on it across all users; an admin may only delete at 0. */
  spoolCount: number;
  /** The viewer's spools of it, oldest first. */
  spools: SpoolView[];
  summary: MaterialStockSummary;
  usage: MaterialUsageHistory;
  properties: Omit<React.ComponentProps<typeof PropertyList>, 'className'>;
  groupStock: Omit<
    React.ComponentProps<typeof MaterialGroupStockTable>,
    'className'
  >;
  /** Spool whose re-weigh is open (highlighted tile). */
  selectedSpoolId?: string | null;
  /** Tile click; gets the tile element to anchor the re-weigh popover. */
  onSelectSpool?: (spool: SpoolView, number: number, tile: HTMLElement) => void;
  onEditSpool?: (spool: SpoolView) => void;
  onMarkDried?: (spool: SpoolView) => void;
  onAddSpool?: () => void;
  onEdit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
  /** Disables the review actions while one runs. */
  reviewPending?: boolean;
};

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * The material page (MaterialDetail + MaterialDetailMobile boards): header
 * with review actions, key figures, the viewer's spools as tiles, 12-month
 * usage, the wiki-style datasheet and the material in the viewer's groups.
 * Presentational: the container wires actions and overlays.
 */
function MaterialDetail({
  material,
  breadcrumb = [{ label: 'Materials', href: '/materials' }],
  isAdmin,
  own,
  spoolCount,
  spools,
  summary,
  usage,
  properties,
  groupStock,
  selectedSpoolId,
  onSelectSpool,
  onEditSpool,
  onMarkDried,
  onAddSpool,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  reviewPending,
}: MaterialDetailProps) {
  const tiles = React.useRef(new Map<string, HTMLDivElement>());
  const { status } = material;
  const canEdit = isAdmin || (own && status !== 'approved');
  const runway =
    summary.leftGrams > 0
      ? forecastDays(summary.leftGrams, usage.gramsPerDay)
      : null;
  const stock = readoutParts(formatWeight(summary.leftGrams));
  const used = readoutParts(formatWeight(usage.usedLast30Grams));
  const lasts = runway === null ? null : readoutParts(formatRunway(runway));
  const value =
    summary.valueCents === null
      ? null
      : readoutParts(formatMoney(summary.valueCents));

  return (
    <div className="flex flex-col gap-10 max-sm:gap-8">
      <div className="flex flex-col">
        <PageHeader
          index="02"
          breadcrumb={[...breadcrumb, { label: material.name }]}
          title={material.name}
          rule={false}
          leading={
            <Swatch
              color={material.color}
              className="size-16 border-2 max-sm:size-11"
            />
          }
          badges={
            <Badge className="h-6 px-2 text-[13px]">
              {material.filamentType}
            </Badge>
          }
          description={
            <span className="flex flex-wrap items-center gap-2.5">
              <span className="kicker text-foreground">
                {material.manufacturer}
              </span>
              {material.color && (
                <>
                  <span className="kicker">·</span>
                  <span className="kicker">{material.color.toUpperCase()}</span>
                </>
              )}
              <span className="kicker">·</span>
              {status === 'approved' ? (
                <span className="kicker">Approved</span>
              ) : (
                <StatusBadge
                  status={status === 'rejected' ? 'rejected' : 'pending'}
                />
              )}
              {material.externalKey && <StatusBadge status="imported" />}
            </span>
          }
          actions={
            <div className="flex flex-col items-end gap-2 max-sm:items-start">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {isAdmin && status !== 'approved' && onApprove && (
                  <Button disabled={reviewPending} onClick={onApprove}>
                    Approve
                  </Button>
                )}
                {isAdmin && status === 'pending' && onReject && (
                  <Button
                    variant="outline"
                    disabled={reviewPending}
                    onClick={onReject}
                  >
                    Reject
                  </Button>
                )}
                {isAdmin && onDelete && (
                  <Button
                    variant="destructive-outline"
                    disabled={reviewPending || spoolCount > 0}
                    aria-describedby={
                      spoolCount > 0 ? 'material-delete-hint' : undefined
                    }
                    onClick={onDelete}
                  >
                    <Trash2Icon />
                    Delete
                  </Button>
                )}
                {canEdit && onEdit && (
                  <Button variant="outline" onClick={onEdit}>
                    <PencilIcon />
                    Edit
                  </Button>
                )}
                {onAddSpool && (
                  <Button variant="accent" onClick={onAddSpool}>
                    <PlusIcon />
                    Add spool
                    <Kbd aria-hidden>N</Kbd>
                  </Button>
                )}
              </div>
              {isAdmin && spoolCount > 0 && (
                <span id="material-delete-hint" className="fine">
                  In use by {plural(spoolCount, 'spool')}
                </span>
              )}
            </div>
          }
        />
        <ReadoutStrip label="Key figures" ruled className="mt-5">
          <Readout
            label="Your stock"
            value={stock.value}
            unit={stock.unit}
            sub={plural(summary.stockedCount, 'spool')}
          />
          <Readout
            label="Used · 30 days"
            value={used.value}
            unit={used.unit}
            sub="from weighing history"
          />
          <Readout
            label="Lasts about"
            value={lasts ? `~${lasts.value}` : '—'}
            unit={lasts?.unit}
            sub={lasts ? 'at the current pace' : 'no recent usage'}
          />
          <Readout
            label="Stock value"
            value={value?.value ?? '—'}
            unit={value?.unit}
            sub={
              summary.avgPricePerKgCents === null
                ? 'no prices yet'
                : `Ø ${formatMoney(summary.avgPricePerKgCents)} / kg · ${summary.pricedCount}/${summary.stockedCount} priced`
            }
          />
        </ReadoutStrip>
      </div>

      <section aria-labelledby="material-spools">
        <SectionHeader
          index="01"
          id="material-spools"
          title="Your spools"
          aside={
            spools.length > 0 &&
            onSelectSpool && (
              <span className="kicker max-sm:hidden">
                Click a tile to re-weigh
              </span>
            )
          }
        />
        <div className="flex flex-wrap gap-3 max-sm:grid max-sm:grid-cols-2">
          {spools.map((spool, i) => (
            <SpoolTile
              key={spool.id}
              spool={spool}
              number={i + 1}
              details
              selected={selectedSpoolId === spool.id}
              className="max-sm:w-auto"
              ref={(el) => {
                if (el) tiles.current.set(spool.id, el);
                else tiles.current.delete(spool.id);
              }}
              onSelect={
                onSelectSpool
                  ? () => {
                      const tile = tiles.current.get(spool.id);
                      if (tile) onSelectSpool(spool, i + 1, tile);
                    }
                  : undefined
              }
              onEdit={onEditSpool ? () => onEditSpool(spool) : undefined}
              onMarkDried={
                onMarkDried && spool.needsDrying
                  ? () => onMarkDried(spool)
                  : undefined
              }
            />
          ))}
          {onAddSpool && (
            <AddSpoolTile
              onClick={onAddSpool}
              className="min-h-[150px] w-[228px] max-sm:min-h-[120px] max-sm:w-auto"
            />
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-x-10 gap-y-8">
        <section
          aria-labelledby="material-usage"
          className="min-w-0 flex-[1_1_420px]"
        >
          <SectionHeader
            index="02"
            id="material-usage"
            title="Usage"
            aside={<span className="kicker">12 months</span>}
          />
          <UsageBarChart
            data={usage.monthly}
            monthLabels="narrow"
            showCost={usage.monthly.some((m) => m.costCents > 0)}
          />
          <p className="mt-4 text-sm">
            <span className="font-mono font-semibold">
              {formatWeight(usage.usedLast30Grams)}
            </span>{' '}
            used in the last 30 days
            {runway !== null && (
              <>
                {' '}
                · lasts about{' '}
                <span className="font-mono font-semibold">
                  {formatDays(runway)}
                </span>{' '}
                at this pace
              </>
            )}
          </p>
        </section>
        <section
          aria-labelledby="material-properties"
          className="min-w-0 flex-[1.4_1_520px]"
        >
          <SectionHeader
            index="03"
            id="material-properties"
            title="Properties"
            aside={
              <span className="kicker max-sm:hidden">
                Datasheet · editable by members
              </span>
            }
          />
          <PropertyList {...properties} />
        </section>
      </div>

      <section aria-labelledby="material-groups">
        <SectionHeader
          index="04"
          id="material-groups"
          title="In your groups"
          aside={<Link href="/groups">Group stock →</Link>}
        />
        {groupStock.rows.length > 0 ? (
          <MaterialGroupStockTable {...groupStock} />
        ) : (
          <EmptyState
            title="Nobody in your groups shares this material"
            description="Spools of it that group members share show up here to borrow."
          />
        )}
      </section>
    </div>
  );
}

export { MaterialDetail };
