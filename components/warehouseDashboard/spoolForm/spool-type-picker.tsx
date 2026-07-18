'use client';

import { useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { spoolTypeLabel } from '@/lib/filament';
import type { SpoolType } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

const MAX_RESULTS = 50;

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
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mfr = manufacturer.trim().toLowerCase();

  const { filtered, scoped } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') {
      // Default: the material's manufacturer, if it has any spool types.
      if (mfr) {
        const byMfr = spoolTypes.filter(
          (t) => t.manufacturer.toLowerCase() === mfr
        );
        if (byMfr.length > 0) return { filtered: byMfr, scoped: true };
      }
      return { filtered: spoolTypes, scoped: false };
    }
    return {
      filtered: spoolTypes.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.manufacturer.toLowerCase().includes(q)
      ),
      scoped: false,
    };
  }, [spoolTypes, query, mfr]);
  const results = filtered.slice(0, MAX_RESULTS);

  function select(t: SpoolType) {
    onChange(t);
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
      const t = results[activeIndex];
      if (t) select(t);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const displayValue = open ? query : value ? spoolTypeLabel(value) : '';

  return (
    <div className="relative">
      <Input
        id={id}
        value={displayValue}
        placeholder="Search spool type or manufacturer…"
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
