'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/common/select-field';
import { useCombobox } from '@/hooks/use-combobox';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  getMaterialManufacturers,
  searchMaterials,
} from '@/app/actions/materials';
import { DEFAULT_MATERIAL_COLOR, materialLabel } from '@/lib/filament';
import {
  ALL_MANUFACTURERS,
  ALL_TYPES,
  TYPE_ITEMS,
} from '@/lib/catalog-filter-items';
import type { Material } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

// Searchable combobox for the material catalog. A SpoolmanDB import grows the
// catalog to tens of thousands of rows, so the search runs in SQL
// (searchMaterials) and only a page of results is ever sent here — the previous
// version received every material as a prop, which put >400 bytes per material
// into the dashboard payload. The manufacturer/type dropdowns narrow the same
// query, for browsing a brand rather than typing a name.
export function MaterialPicker({
  value,
  onChange,
  id,
}: {
  value: Material | null;
  onChange: (material: Material) => void;
  id?: string;
}) {
  const [manufacturer, setManufacturer] = useState<string>(ALL_MANUFACTURERS);
  const [filamentType, setFilamentType] = useState<string>(ALL_TYPES);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [matches, setMatches] = useState<Material[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const combobox = useCombobox({
    items: matches,
    // Filtering happens in SQL; the hook keeps query/keyboard/open state.
    filter: (items) => items,
    maxResults: PAGE_SIZE,
    selectedLabel: value ? materialLabel(value) : '',
    onSelect: onChange,
  });
  const {
    open,
    query,
    activeIndex,
    results,
    setActiveIndex,
    select,
    inputProps,
    listboxProps,
  } = combobox;

  const debouncedQuery = useDebouncedValue(query);

  useEffect(() => {
    getMaterialManufacturers()
      .then(setManufacturers)
      .catch(() => setManufacturers([]));
  }, []);

  // Sequence guard: responses can arrive out of order, and a stale one would
  // overwrite the results for what the user has since typed.
  const requestId = useRef(0);

  useEffect(() => {
    const current = ++requestId.current;
    setLoading(true);
    searchMaterials({
      q: debouncedQuery.trim(),
      manufacturer: manufacturer === ALL_MANUFACTURERS ? null : manufacturer,
      filamentType: filamentType === ALL_TYPES ? null : filamentType,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (current !== requestId.current) return;
        setMatches(res.materials);
        setTotal(res.total);
        setLoading(false);
      })
      .catch(() => {
        if (current !== requestId.current) return;
        setMatches([]);
        setTotal(0);
        setLoading(false);
      });
  }, [debouncedQuery, manufacturer, filamentType]);

  const narrowed =
    manufacturer !== ALL_MANUFACTURERS || filamentType !== ALL_TYPES;

  const manufacturerItems = [
    { value: ALL_MANUFACTURERS, label: 'All manufacturers' },
    ...manufacturers.map((m) => ({ value: m, label: m })),
  ];

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
                {loading
                  ? 'Searching…'
                  : narrowed
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
                {total > results.length && (
                  <p className="text-muted-foreground px-3 py-2 text-xs">
                    Showing first {results.length} of {total} — refine your
                    search.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <SelectField
          items={manufacturerItems}
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
