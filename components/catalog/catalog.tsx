'use client';

import { useMemo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { SearchInput } from '@/components/common/search-input';
import { SelectField } from '@/components/common/select-field';
import { ALL_STATUS, STATUS_ITEMS } from '@/lib/catalog-filter-items';

const MAX_ROWS = 150;

type CatalogEntity = {
  id: string;
  manufacturer: string;
  name: string;
  status: string;
};

type ExtraFilter = {
  value: string | null;
  onChange: (value: string | null) => void;
  items: readonly { value: string; label: ReactNode }[];
  allValue: string;
  ariaLabel: string;
  triggerClassName?: string;
};

// Shared shell for the material & spool-type catalogs: search + an optional
// extra filter (the material catalog's filament-type select) + admin status
// filter/review-pending shortcut, grouped by manufacturer.
//
// Presentational only — `items` arrives already filtered, and query/status are
// controlled. The two catalogs filter in different places for good reason: spool
// types are a short list filtered client-side, while materials run to tens of
// thousands of rows after a SpoolmanDB import and are filtered in SQL, one page
// at a time.
export function Catalog<T extends CatalogEntity>({
  items,
  total,
  grandTotal,
  pendingCount,
  query,
  onQueryChange,
  status,
  onStatusChange,
  isAdmin = false,
  searchPlaceholder,
  searchAriaLabel,
  emptyText,
  extraFilter,
  extraControls,
  extraActive = false,
  onClearExtra,
  busy = false,
  renderRow,
}: {
  // The rows to render (already filtered, already limited to a page).
  items: T[];
  // Matches for the current filters, which may exceed `items.length`.
  total: number;
  // Size of the whole catalog, for the "x of y" readout.
  grandTotal: number;
  // Pending rows across the whole catalog — drives the admin review shortcut.
  pendingCount?: number;
  query: string;
  onQueryChange: (value: string) => void;
  status: string | null;
  onStatusChange: (value: string | null) => void;
  isAdmin?: boolean;
  searchPlaceholder: string;
  searchAriaLabel: string;
  emptyText: string;
  extraFilter?: ExtraFilter;
  extraControls?: ReactNode;
  extraActive?: boolean;
  onClearExtra?: () => void;
  // A server-driven search is in flight.
  busy?: boolean;
  renderRow: (item: T) => ReactNode;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const item of items.slice(0, MAX_ROWS)) {
      const list = map.get(item.manufacturer) ?? [];
      list.push(item);
      map.set(item.manufacturer, list);
    }
    return [...map.entries()];
  }, [items]);

  const active =
    query.trim() !== '' ||
    status !== null ||
    !!extraFilter?.value ||
    extraActive;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="border-border bg-card flex flex-wrap items-center gap-2 rounded-lg border px-3 py-3 sm:gap-3 sm:px-4">
        <SearchInput
          value={query}
          onChange={onQueryChange}
          placeholder={searchPlaceholder}
          ariaLabel={searchAriaLabel}
        />
        {extraFilter && (
          <SelectField
            items={extraFilter.items}
            value={extraFilter.value ?? extraFilter.allValue}
            onValueChange={(v) =>
              extraFilter.onChange(v === extraFilter.allValue ? null : v)
            }
            triggerClassName={extraFilter.triggerClassName}
            ariaLabel={extraFilter.ariaLabel}
          />
        )}
        {isAdmin && (
          <>
            <SelectField
              items={STATUS_ITEMS}
              value={status ?? ALL_STATUS}
              onValueChange={(v) => onStatusChange(v === ALL_STATUS ? null : v)}
              triggerClassName="h-9 w-36"
              ariaLabel="Filter by status"
            />
            {pendingCount !== undefined &&
              pendingCount > 0 &&
              status !== 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  onClick={() => onStatusChange('pending')}
                >
                  Review pending ({pendingCount})
                </Button>
              )}
          </>
        )}
        {active && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground h-9"
            onClick={() => {
              onQueryChange('');
              onStatusChange(null);
              extraFilter?.onChange(null);
              onClearExtra?.();
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
        <span className="text-muted-foreground ml-auto text-xs whitespace-nowrap">
          {busy ? 'Searching…' : `${total} of ${grandTotal}`}
        </span>
      </div>

      {extraControls}

      {groups.length === 0 ? (
        <div className="border-border bg-card/50 text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
          {emptyText}
        </div>
      ) : (
        groups.map(([manufacturer, list]) => (
          <section
            key={manufacturer}
            className="border-border bg-card rounded-lg border"
          >
            <h2 className="border-border border-b px-6 py-3 font-semibold">
              {manufacturer}
            </h2>
            <ul className="divide-border divide-y">{list.map(renderRow)}</ul>
          </section>
        ))
      )}

      {total > items.slice(0, MAX_ROWS).length && (
        <p className="text-muted-foreground text-center text-xs">
          Showing first {Math.min(items.length, MAX_ROWS)} of {total} — refine
          your search.
        </p>
      )}
    </div>
  );
}
