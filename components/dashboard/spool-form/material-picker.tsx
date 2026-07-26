'use client';

import { Input } from '@/components/ui/input';
import { useCombobox } from '@/hooks/use-combobox';
import { DEFAULT_MATERIAL_COLOR, materialLabel } from '@/lib/filament';
import type { Material } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

// Searchable combobox for the material catalog. The SpoolmanDB import grows the
// catalog to hundreds/thousands of rows, where a plain Select is unusable — this
// filters client-side on name + manufacturer and caps the visible list.
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
    items: materials,
    filter: (items, query) => {
      const q = query.trim().toLowerCase();
      if (q === '') return items;
      return items.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.manufacturer.toLowerCase().includes(q)
      );
    },
    selectedLabel: value ? materialLabel(value) : '',
    onSelect: onChange,
  });

  return (
    <div className="relative">
      <Input
        id={id}
        placeholder="Search material or manufacturer…"
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
              No materials match.
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
                    style={{ backgroundColor: m.color ?? DEFAULT_MATERIAL_COLOR }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {m.name}{' '}
                    <span className="text-muted-foreground">
                      — {m.manufacturer}
                    </span>
                    {m.status === 'pending' && (
                      <span className="text-muted-foreground"> · pending</span>
                    )}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono text-xs">
                    {m.filamentType}
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
