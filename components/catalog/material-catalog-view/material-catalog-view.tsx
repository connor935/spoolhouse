'use client';

import * as React from 'react';

import { CatalogPage } from '@/components/catalog/catalog-page';
import { CatalogRow } from '@/components/catalog/catalog-row';
import { CatalogToolbar } from '@/components/catalog/catalog-toolbar';
import { ManufacturerHeader } from '@/components/catalog/manufacturer-header';
import { ActiveFilterChips } from '@/components/common/active-filter-chips';
import { EmptyState } from '@/components/common/empty-state';
import type { FilterProperty } from '@/components/common/filter-fields';
import { FilterPanel } from '@/components/common/filter-panel';
import { FilterSheet } from '@/components/common/filter-sheet';
import { Button } from '@/components/ui/button';
import type { Material } from '@/lib/db/schema';
import {
  countActiveFilters,
  filterChips,
  removeFilterChip,
  type FilterValue,
} from '@/lib/filter-value';

export type MaterialCatalogRowData = {
  material: Material;
  /** The viewer's spools of it. */
  stockCount: number;
  /** The viewer submitted it. */
  own: boolean;
};

export type MaterialCatalogGroup = {
  manufacturer: string;
  /** Matches for this manufacturer, which may exceed the rows shown. */
  total: number;
  entries: MaterialCatalogRowData[];
};

type MaterialCatalogViewProps = {
  groups: MaterialCatalogGroup[];
  /** Matches for the current search and filters. */
  matching: number;
  /** Materials the viewer can see at all. */
  total: number;
  query: string;
  onQueryChange: (query: string) => void;
  filter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
  /** Datasheet properties offered as range filters. */
  properties: readonly FilterProperty[];
  onClear: () => void;
  busy?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  /** Admins and trusted contributors add instead of request. */
  autoApprove: boolean;
  requestOpen: boolean;
  onRequestOpenChange: (open: boolean) => void;
  requestForm: React.ReactNode;
  compact?: boolean;
};

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * The /materials page (CatalogMaterials + CatalogMobile boards): search,
 * filters (panel on desktop, sheet on phones) with removable chips, rows
 * grouped by manufacturer linking to each material's page, and Load more.
 * The search runs on the server; this only renders a page of it.
 */
function MaterialCatalogView({
  groups,
  matching,
  total,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  properties,
  onClear,
  busy = false,
  onLoadMore,
  loadingMore = false,
  autoApprove,
  requestOpen,
  onRequestOpenChange,
  requestForm,
  compact = false,
}: MaterialCatalogViewProps) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const filtersId = React.useId();
  const shown = groups.reduce((n, g) => n + g.entries.length, 0);
  const filterCount = countActiveFilters(filter);

  return (
    <CatalogPage
      index="06"
      title="Materials"
      totalEntries={total}
      description={
        autoApprove
          ? "Global material catalog. Missing one? Add it — as an admin it's published straight away."
          : 'Global material catalog. Missing one? Request it — you can use it immediately while an admin reviews it.'
      }
      requestLabel={autoApprove ? 'Add material' : 'Request material'}
      requestTitle={
        autoApprove ? 'Add a new material' : 'Request a new material'
      }
      requestOpen={requestOpen}
      onRequestOpenChange={onRequestOpenChange}
      requestForm={requestForm}
      compact={compact}
    >
      <div className="flex flex-col gap-3">
        {compact && (
          <span className="kicker">
            {fmt(matching)} of {fmt(total)}
          </span>
        )}
        <CatalogToolbar
          query={query}
          onQueryChange={onQueryChange}
          searchLabel="Search materials"
          placeholder="Search manufacturer, material or color…"
          filterCount={filterCount}
          filtersOpen={filtersOpen}
          filtersId={filtersId}
          onFiltersClick={() => setFiltersOpen((o) => !o)}
          onClear={onClear}
          matching={matching}
          total={total}
          busy={busy}
          compact={compact}
        />
        {!compact && filtersOpen && (
          <FilterPanel
            id={filtersId}
            value={filter}
            onChange={onFilterChange}
            properties={properties}
          />
        )}
        {!compact && (
          <ActiveFilterChips
            chips={filterChips(filter, properties)}
            onRemove={(id) => onFilterChange(removeFilterChip(filter, id))}
          />
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="No materials match"
          description="Try fewer words or clear a filter. Missing one? Request it."
        />
      ) : (
        <div aria-busy={busy || undefined}>
          {groups.map((group) => (
            <section key={group.manufacturer} aria-label={group.manufacturer}>
              <ManufacturerHeader
                name={group.manufacturer}
                count={group.total}
                compact={compact}
              />
              {group.entries.map((e) => (
                <CatalogRow
                  key={e.material.id}
                  entry={{
                    kind: 'material',
                    material: e.material,
                    stockCount: e.stockCount,
                  }}
                  own={e.own}
                  compact={compact}
                  href={`/materials/${e.material.id}`}
                />
              ))}
            </section>
          ))}
        </div>
      )}

      {shown < matching && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="kicker">
            Showing first {fmt(shown)} of {fmt(matching)} — refine your search.
          </span>
          {onLoadMore && (
            <Button
              variant="outline"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </div>
      )}

      {compact && (
        <FilterSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          value={filter}
          onChange={onFilterChange}
          properties={properties}
          resultCount={matching}
          resultNoun={['material', 'materials']}
        />
      )}
    </CatalogPage>
  );
}

export { MaterialCatalogView };
