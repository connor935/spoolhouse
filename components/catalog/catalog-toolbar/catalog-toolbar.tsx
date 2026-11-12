'use client';

import { SearchIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useRef } from 'react';

import { FiltersButton } from '@/components/common/filter-panel';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { focusSearch } from '@/lib/hotkeys';
import { cn } from '@/lib/utils';

type CatalogToolbarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  /** e.g. "Search materials". */
  searchLabel: string;
  placeholder?: string;
  /** Active filters; omit `onFiltersClick` for a catalog without filters. */
  filterCount?: number;
  filtersOpen?: boolean;
  /** id of the panel the Filters button opens. */
  filtersId?: string;
  onFiltersClick?: () => void;
  /** Shown while a search or filter is set. */
  onClear?: () => void;
  matching: number;
  total: number;
  /** A server search is in flight. */
  busy?: boolean;
  /** Phone layout (CatalogMobile): taller input, icon-only filters button. */
  compact?: boolean;
  className?: string;
};

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * Search row over a catalog (CatalogMaterials / CatalogSpoolTypes boards):
 * search input, Filters toggle, Clear and the "1,204 of 23,871" count.
 * "/" focuses the search (desktop, where the hint shows).
 */
function CatalogToolbar({
  query,
  onQueryChange,
  searchLabel,
  placeholder,
  filterCount = 0,
  filtersOpen = false,
  filtersId,
  onFiltersClick,
  onClear,
  matching,
  total,
  busy = false,
  compact = false,
  className,
}: CatalogToolbarProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  useHotkeys({ '/': () => focusSearch(searchRef.current) }, !compact);
  const active = query.trim() !== '' || filterCount > 0;
  return (
    <div
      data-slot="catalog-toolbar"
      className={cn('flex flex-wrap items-center gap-2.5', className)}
    >
      <InputGroup
        variant="ink"
        className={cn('w-auto flex-[1_1_320px]', compact && 'h-11 flex-1')}
      >
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          ref={searchRef}
          type="search"
          aria-keyshortcuts={compact ? undefined : '/'}
          aria-label={searchLabel}
          placeholder={placeholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {!compact && (
          <InputGroupAddon>
            <Kbd aria-hidden>/</Kbd>
          </InputGroupAddon>
        )}
      </InputGroup>
      {onFiltersClick &&
        (compact ? (
          <Button
            variant="outline"
            className="relative size-11 p-0"
            aria-label={
              filterCount > 0 ? `Filters, ${filterCount} active` : 'Filters'
            }
            onClick={onFiltersClick}
          >
            <SlidersHorizontalIcon />
            {filterCount > 0 && (
              <span
                aria-hidden
                className="bg-accent absolute top-2 right-2 size-2 rounded-full"
              />
            )}
          </Button>
        ) : (
          <FiltersButton
            count={filterCount}
            open={filtersOpen}
            aria-controls={filtersId}
            onClick={onFiltersClick}
          />
        ))}
      {active && onClear && !compact && (
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
      )}
      {!compact && (
        <span className="kicker ml-auto" aria-live="polite">
          {busy ? (
            'Searching…'
          ) : (
            <>
              <span className="text-foreground">{fmt(matching)}</span> of{' '}
              {fmt(total)}
            </>
          )}
        </span>
      )}
    </div>
  );
}

export { CatalogToolbar };
