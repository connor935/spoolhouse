'use client';

import * as React from 'react';
import { PackageIcon, PlusIcon } from 'lucide-react';

import { ActiveFilterChips } from '@/components/common/active-filter-chips';
import { EmptyState } from '@/components/common/empty-state';
import type { FilterProperty } from '@/components/common/filter-fields';
import { FilterPanel, FiltersButton } from '@/components/common/filter-panel';
import { FilterSheet } from '@/components/common/filter-sheet';
import { PageHeader } from '@/components/common/page-header';
import { SearchInput } from '@/components/common/search-input';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useHotkeys } from '@/hooks/use-hotkeys';
import type { Material } from '@/lib/db/schema';
import {
  formatWeight,
  type MaterialInventory,
  type SpoolView,
} from '@/lib/filament';
import {
  countActiveFilters,
  filterChips,
  removeFilterChip,
  type FilterValue,
} from '@/lib/filter-value';
import { statusCounts, visibleMaterialEntries } from '@/lib/inventory-filter';
import {
  DEFAULT_INVENTORY_QUERY,
  type InventoryQuery,
  type StockStatus,
} from '@/lib/inventory-params';
import type { MaterialPropertyView } from '@/lib/material-properties';
import { stockSummary } from '@/lib/overview';
import { cn } from '@/lib/utils';

import { MaterialBlock } from '../material-block';

const STEPS = [
  'Pick a material from the catalog',
  'Weigh the full spool',
  'Re-weigh after printing',
];

type InventoryViewProps = {
  /** All of the user's spools, grouped by material (`groupInventory`). */
  inventory: MaterialInventory[];
  query: InventoryQuery;
  /** The page mirrors it into the URL. */
  onQueryChange: (next: InventoryQuery) => void;
  /** Datasheet properties offered as range filters. */
  properties: readonly FilterProperty[];
  propertiesByMaterialId: Record<string, MaterialPropertyView[]>;
  forecastDaysByMaterial?: Readonly<Record<string, number | null>>;
  /** Pending borrow requests on the user's spools: spool id → requester. */
  requestedBy?: Readonly<Record<string, string>>;
  /** `mobile`: collapsible material cards and the filter sheet. */
  layout?: 'desktop' | 'mobile';
  selectedSpoolId?: string | null;
  /** null = the header's "Add spool", no material preset. */
  onAddSpool: (material: Material | null) => void;
  onSelectSpool?: (spool: SpoolView, material: Material) => void;
  onEditSpool?: (spool: SpoolView, material: Material) => void;
  onMarkDried?: (spool: SpoolView) => void;
  onOpenMaterial?: (material: Material) => void;
  /** Each tile's element, to anchor the re-weigh popover. */
  tileRef?: (spoolId: string, element: HTMLDivElement | null) => void;
  className?: string;
};

function spoolCount(n: number) {
  return `${n} spool${n === 1 ? '' : 's'}`;
}

/**
 * /inventory (Inventory + MobileInventory boards): stock status toggle,
 * search, filters with chips, then one MaterialBlock per material with its
 * matching spools.
 */
function InventoryView({
  inventory,
  query,
  onQueryChange,
  properties,
  propertiesByMaterialId,
  forecastDaysByMaterial,
  requestedBy,
  layout = 'desktop',
  selectedSpoolId,
  onAddSpool,
  onSelectSpool,
  onEditSpool,
  onMarkDried,
  onOpenMaterial,
  tileRef,
  className,
}: InventoryViewProps) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const panelId = React.useId();
  const mobile = layout === 'mobile';

  const summary = stockSummary(inventory);
  const counts = statusCounts(inventory);
  const visible = visibleMaterialEntries(
    inventory,
    query,
    propertiesByMaterialId
  );
  const visibleSpools = visible.reduce((n, e) => n + e.visibleIds.size, 0);
  const activeFilters = countActiveFilters(query);
  const searching = activeFilters > 0 || query.q.trim() !== '';

  const setFilters = (next: FilterValue) =>
    onQueryChange({ ...query, ...next });
  const filterFields = {
    value: query,
    onChange: setFilters,
    showMinLeft: true,
    properties,
  };

  useHotkeys({ n: () => onAddSpool(null) });
  const addButton = (
    <Button
      variant="accent"
      onClick={() => onAddSpool(null)}
      aria-keyshortcuts="N"
    >
      <PlusIcon aria-hidden />
      Add spool
      {!mobile && <Kbd aria-hidden>N</Kbd>}
    </Button>
  );

  let content: React.ReactNode;
  if (inventory.length === 0) {
    content = (
      <EmptyState
        icon={<PackageIcon />}
        kicker="Inventory"
        title="Your shelf is empty"
        description="Add a spool, weigh it now and then, and Spoolhouse tracks what's left, what you use and what it costs."
        steps={STEPS}
        action={
          <Button variant="accent" onClick={() => onAddSpool(null)}>
            Add your first spool
          </Button>
        }
      />
    );
  } else if (visible.length === 0) {
    content = searching ? (
      <EmptyState
        kicker="Inventory"
        title="No spools match these filters."
        action={
          <Button
            variant="outline"
            onClick={() =>
              onQueryChange({
                ...DEFAULT_INVENTORY_QUERY,
                status: query.status,
              })
            }
          >
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        kicker="Inventory"
        title={
          query.status === 'empty' ? 'No empty spools yet.' : 'No spools here.'
        }
      />
    );
  } else {
    content = (
      <div className={cn(mobile && 'flex flex-col gap-2.5')}>
        {visible.map(({ inventory: entry, visibleIds }) => {
          const { material } = entry;
          return (
            <MaterialBlock
              key={material.id}
              inventory={entry}
              layout={mobile ? 'card' : 'shelf'}
              filter={(s) => visibleIds.has(s.id)}
              forecastDays={forecastDaysByMaterial?.[material.id]}
              selectedSpoolId={selectedSpoolId}
              requestedBy={requestedBy}
              onOpenMaterial={
                onOpenMaterial ? () => onOpenMaterial(material) : undefined
              }
              onSelectSpool={
                onSelectSpool ? (s) => onSelectSpool(s, material) : undefined
              }
              onEditSpool={
                onEditSpool ? (s) => onEditSpool(s, material) : undefined
              }
              onMarkDried={onMarkDried}
              onAddSpool={() => onAddSpool(material)}
              tileRef={tileRef}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      data-slot="inventory-view"
      className={cn('flex flex-col gap-5', className)}
    >
      <PageHeader
        index="02"
        kicker="Inventory"
        meta={`${spoolCount(summary.inStock)} · ${formatWeight(summary.leftGrams)} · ${summary.materials} material${summary.materials === 1 ? '' : 's'}`}
        title="Inventory"
        actions={addButton}
      />

      {inventory.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <ToggleGroup
              aria-label="Stock status"
              value={[query.status]}
              onValueChange={(next) =>
                next[0] &&
                onQueryChange({ ...query, status: next[0] as StockStatus })
              }
              className={cn(mobile && 'w-full [&>*]:flex-1')}
            >
              <ToggleGroupItem value="in-stock" count={counts.inStock}>
                In stock
              </ToggleGroupItem>
              <ToggleGroupItem value="empty" count={counts.empty}>
                Empty
              </ToggleGroupItem>
              <ToggleGroupItem value="all" count={counts.all}>
                All
              </ToggleGroupItem>
            </ToggleGroup>
            <SearchInput
              value={query.q}
              onChange={(q) => onQueryChange({ ...query, q })}
              placeholder="Search material, manufacturer or location…"
              ariaLabel="Search inventory"
              shortcut={!mobile}
              className="min-w-48"
            />
            <FiltersButton
              count={activeFilters}
              open={filtersOpen}
              aria-controls={mobile ? undefined : panelId}
              onClick={() => setFiltersOpen((o) => !o)}
            />
          </div>
          {!mobile && filtersOpen && (
            <FilterPanel id={panelId} {...filterFields} />
          )}
          <ActiveFilterChips
            chips={filterChips(query, properties)}
            onRemove={(id) => setFilters(removeFilterChip(query, id))}
          />
        </div>
      )}

      {content}

      {mobile && (
        <FilterSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          resultCount={visibleSpools}
          {...filterFields}
        />
      )}
    </div>
  );
}

export { InventoryView };
