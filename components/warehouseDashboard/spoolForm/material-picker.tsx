'use client';

import { useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { materialLabel } from '@/lib/filament';
import type { Material } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

const MAX_RESULTS = 50;

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
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return materials;
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q)
    );
  }, [materials, query]);
  const results = filtered.slice(0, MAX_RESULTS);

  function select(m: Material) {
    onChange(m);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const m = results[activeIndex];
      if (m) select(m);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const displayValue = open ? query : value ? materialLabel(value) : '';

  return (
    <div className="relative">
      <Input
        id={id}
        value={displayValue}
        placeholder="Search material or manufacturer…"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={id ? `${id}-listbox` : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          // Keep input focus so the blur timer doesn't close before onClick.
          onMouseDown={(e) => e.preventDefault()}
          className="border-border bg-popover text-popover-foreground absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border shadow-md"
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
                    style={{ backgroundColor: m.color ?? '#94a3b8' }}
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
              {filtered.length > MAX_RESULTS && (
                <p className="text-muted-foreground px-3 py-2 text-xs">
                  Showing first {MAX_RESULTS} of {filtered.length} — refine your
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
