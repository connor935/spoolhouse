'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { SearchInput } from '@/components/search-input';
import { SelectField } from '@/components/select-field';
import { ALL_STATUS, STATUS_ITEMS } from '@/lib/catalog-filter-items';

const MAX_ROWS = 150;

type CatalogEntity = {
  id: string;
  manufacturer: string;
  name: string;
  status: string;
};

type ExtraFilter<T> = {
  value: string | null;
  onChange: (value: string | null) => void;
  items: readonly { value: string; label: ReactNode }[];
  allValue: string;
  ariaLabel: string;
  triggerClassName?: string;
  matches: (item: T, value: string) => boolean;
};

// Shared shell for the material & spool-type catalogs: search (name +
// manufacturer) + an optional extra filter (material's filament-type select)
// + admin status filter/review-pending shortcut, grouped by manufacturer and
// capped at MAX_ROWS (the SpoolmanDB import can push either catalog into the
// thousands of rows). Each catalog supplies its own row renderer and copy.
export function Catalog<T extends CatalogEntity>({
  items,
  isAdmin = false,
  searchPlaceholder,
  searchAriaLabel,
  emptyText,
  extraFilter,
  renderRow,
}: {
  items: T[];
  isAdmin?: boolean;
  searchPlaceholder: string;
  searchAriaLabel: string;
  emptyText: string;
  extraFilter?: ExtraFilter<T>;
  renderRow: (item: T) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  // Admin-only review queue filter (All / Pending / Rejected / Approved).
  const [status, setStatus] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (extraFilter?.value && !extraFilter.matches(item, extraFilter.value))
        return false;
      if (status && item.status !== status) return false;
      if (q === '') return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.manufacturer.toLowerCase().includes(q)
      );
    });
  }, [items, query, status, extraFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const item of filtered.slice(0, MAX_ROWS)) {
      const list = map.get(item.manufacturer) ?? [];
      list.push(item);
      map.set(item.manufacturer, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === 'pending').length,
    [items]
  );
  const active = query.trim() !== '' || status !== null || !!extraFilter?.value;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="border-border bg-card flex flex-wrap items-center gap-2 rounded-lg border px-3 py-3 sm:gap-3 sm:px-4">
        <SearchInput
          value={query}
          onChange={setQuery}
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
              onValueChange={(v) => setStatus(v === ALL_STATUS ? null : v)}
              triggerClassName="h-9 w-36"
              ariaLabel="Filter by status"
            />
            {pendingCount > 0 && status !== 'pending' && (
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                onClick={() => setStatus('pending')}
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
              setQuery('');
              setStatus(null);
              extraFilter?.onChange(null);
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
        <span className="text-muted-foreground ml-auto text-xs whitespace-nowrap">
          {filtered.length} of {items.length}
        </span>
      </div>

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

      {filtered.length > MAX_ROWS && (
        <p className="text-muted-foreground text-center text-xs">
          Showing first {MAX_ROWS} of {filtered.length} — refine your search.
        </p>
      )}
    </div>
  );
}
