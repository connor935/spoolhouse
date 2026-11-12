'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { useCombobox } from '@/hooks/use-combobox';
import { spoolTypeLabel } from '@/lib/filament';
import { matchRank, matchesTokens, searchTokens } from '@/lib/search';
import type { SpoolType } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

// Searchable combobox for spool types (mirrors MaterialPicker). With an empty
// query it scopes the list to the selected material's `manufacturer` — the vast
// majority of the time you want that manufacturer's spool — but typing searches
// across ALL spool types, so it's a convenience filter, not a hard lock.
export function SpoolTypePicker({
  spoolTypes,
  value,
  onChange,
  manufacturer = '',
  id,
}: {
  spoolTypes: SpoolType[];
  value: SpoolType | null;
  onChange: (spoolType: SpoolType) => void;
  manufacturer?: string;
  id?: string;
}) {
  const mfr = manufacturer.trim().toLowerCase();

  const {
    query,
    open,
    activeIndex,
    results,
    filtered,
    maxResults,
    setActiveIndex,
    select,
    inputProps,
    listboxProps,
  } = useCombobox({
    items: spoolTypes,
    filter: (items, rawQuery) => {
      const q = rawQuery.trim().toLowerCase();
      if (q === '') {
        // Default: the material's manufacturer, if it has any spool types.
        if (mfr) {
          const byMfr = items.filter(
            (t) => t.manufacturer.toLowerCase() === mfr
          );
          if (byMfr.length > 0) return byMfr;
        }
        return items;
      }
      const tokens = searchTokens(q);
      return items
        .filter((t) => matchesTokens(tokens, t.manufacturer, t.name))
        .sort(
          (a, b) =>
            matchRank(tokens, a.manufacturer, a.name) -
            matchRank(tokens, b.manufacturer, b.name)
        );
    },
    selectedLabel: value ? spoolTypeLabel(value) : '',
    onSelect: onChange,
  });

  const scoped = useMemo(
    () =>
      query.trim() === '' &&
      !!mfr &&
      spoolTypes.some((t) => t.manufacturer.toLowerCase() === mfr),
    [query, mfr, spoolTypes]
  );

  return (
    <div className="relative">
      <Input
        id={id}
        placeholder="Search spool type or manufacturer…"
        aria-controls={id ? `${id}-listbox` : undefined}
        {...inputProps}
      />
      {open && (
        <div
          id={id ? `${id}-listbox` : undefined}
          className="border-border bg-popover text-popover-foreground absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border shadow-md"
          {...listboxProps}
        >
          {results.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-sm">
              No spool types match.
            </p>
          ) : (
            <>
              {scoped && (
                <p className="text-muted-foreground px-3 pt-2 pb-1 text-xs">
                  {manufacturer} spool types — type to search all
                </p>
              )}
              {results.map((t, i) => (
                <button
                  type="button"
                  key={t.id}
                  role="option"
                  aria-selected={i === activeIndex}
                  onClick={() => select(t)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                    i === activeIndex && 'bg-accent text-accent-foreground'
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {t.name}{' '}
                    <span className="text-muted-foreground">
                      — {t.manufacturer}
                    </span>
                    {t.status === 'pending' && (
                      <span className="text-muted-foreground"> · pending</span>
                    )}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono text-xs">
                    {t.emptyWeightGrams} g
                  </span>
                </button>
              ))}
              {filtered.length > maxResults && (
                <p className="text-muted-foreground px-3 py-2 text-xs">
                  Showing first {maxResults} of {filtered.length} — refine your
                  search.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
