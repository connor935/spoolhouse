'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/common/select-field';
import { useCombobox } from '@/hooks/use-combobox';
import { DEFAULT_MATERIAL_COLOR, materialLabel } from '@/lib/filament';
import {
  ALL_MANUFACTURERS,
  ALL_TYPES,
  TYPE_ITEMS,
  manufacturerItems,
} from '@/lib/catalog-filter-items';
import { matchRank, matchesTokens, searchTokens } from '@/lib/search';
import type { Material } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

// Searchable combobox for the material catalog. The SpoolmanDB import grows the
// catalog to hundreds/thousands of rows, where a plain Select is unusable — this
// filters client-side (see lib/search.ts) and caps the visible list. The
// manufacturer/type dropdowns narrow the pool before the search runs, for
// browsing a brand rather than typing a name.
export function MaterialPicker({
  materials,
  value,
  onChange,
  id,
}: {
  materials: Material[];
  value: Material | null;
  onChange: (material: Material) => void;
  id?: string;
}) {
  const [manufacturer, setManufacturer] = useState<string>(ALL_MANUFACTURERS);
  const [filamentType, setFilamentType] = useState<string>(ALL_TYPES);

  const manufacturers = useMemo(
    () => manufacturerItems(materials),
    [materials]
  );

  const pool = useMemo(
    () =>
      materials.filter(
        (m) =>
          (manufacturer === ALL_MANUFACTURERS ||
            m.manufacturer === manufacturer) &&
          (filamentType === ALL_TYPES || m.filamentType === filamentType)
      ),
    [materials, manufacturer, filamentType]
  );

  const narrowed =
    manufacturer !== ALL_MANUFACTURERS || filamentType !== ALL_TYPES;

  const {
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
    items: pool,
    filter: (items, query) => {
      const tokens = searchTokens(query.trim());
      if (tokens.length === 0) return items;
      // Match on manufacturer + product line + filament type, so "polymaker
      // petg red" finds the row (colour names are part of `name`; the `color`
      // column holds a hex value). Prefix matches sort first — the list is
      // capped, and a broad query should not hide the obvious candidate.
      return items
        .filter((m) =>
          matchesTokens(tokens, m.manufacturer, m.name, m.filamentType)
        )
        .sort(
          (a, b) =>
            matchRank(tokens, a.manufacturer, a.name) -
            matchRank(tokens, b.manufacturer, b.name)
        );
    },
    selectedLabel: value ? materialLabel(value) : '',
    onSelect: onChange,
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          id={id}
          placeholder="Search manufacturer, material or color…"
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
                {narrowed
                  ? 'No materials match — try widening the filters below.'
                  : 'No materials match.'}
              </p>
            ) : (
              <>
                {results.map((m, i) => (
                  <button
                    type="button"
                    key={m.id}
                    role="option"
                    aria-selected={i === activeIndex}
                    onClick={() => select(m)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                      i === activeIndex && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <span
                      className="border-border h-4 w-4 shrink-0 rounded-full border"
                      style={{
                        backgroundColor: m.color ?? DEFAULT_MATERIAL_COLOR,
                      }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {m.name}{' '}
                      <span className="text-muted-foreground">
                        — {m.manufacturer}
                      </span>
                      {m.status === 'pending' && (
                        <span className="text-muted-foreground">
                          {' '}
                          · pending
                        </span>
                      )}
                    </span>
                    <span className="text-muted-foreground shrink-0 font-mono text-xs">
                      {m.filamentType}
                    </span>
                  </button>
                ))}
                {filtered.length > maxResults && (
                  <p className="text-muted-foreground px-3 py-2 text-xs">
                    Showing first {maxResults} of {filtered.length} — refine
                    your search.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <SelectField
          items={manufacturers}
          value={manufacturer}
          onValueChange={setManufacturer}
          ariaLabel="Filter materials by manufacturer"
          triggerClassName="h-8 flex-1 text-xs"
        />
        <SelectField
          items={TYPE_ITEMS}
          value={filamentType}
          onValueChange={setFilamentType}
          ariaLabel="Filter materials by filament type"
          triggerClassName="h-8 w-32 text-xs"
        />
      </div>
    </div>
  );
}
