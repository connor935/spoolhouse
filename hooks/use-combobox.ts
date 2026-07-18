'use client';

import { useMemo, useRef, useState } from 'react';

type UseComboboxOptions<T> = {
  items: T[];
  filter: (items: T[], query: string) => T[];
  // Shown in the input when closed and nothing has been typed yet.
  selectedLabel?: string;
  maxResults?: number;
  onSelect?: (item: T) => void;
};

// Shared query/open/activeIndex/blur-timer state + keyboard nav for a
// searchable combobox. Callers own rendering (input + listbox JSX) so
// per-entity option layout stays free-form; this owns the interaction logic
// that's easy to let drift between copies (blur timer vs mousedown, arrow
// keys, escape).
export function useCombobox<T>({
  items,
  filter,
  selectedLabel = '',
  maxResults = 50,
  onSelect,
}: UseComboboxOptions<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => filter(items, query), [items, query, filter]);
  const results = filtered.slice(0, maxResults);

  function select(item: T) {
    onSelect?.(item);
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
      const item = results[activeIndex];
      if (item) select(item);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const inputProps = {
    value: open ? query : selectedLabel,
    autoComplete: 'off' as const,
    role: 'combobox' as const,
    'aria-expanded': open,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setActiveIndex(0);
      setOpen(true);
    },
    onFocus: () => setOpen(true),
    onBlur: () => {
      // Keep the listbox mounted briefly so an option's onClick can fire
      // before it unmounts; the listbox's onMouseDown also prevents the
      // blur that would otherwise beat the click.
      blurTimer.current = setTimeout(() => setOpen(false), 120);
    },
    onKeyDown,
  };

  const listboxProps = {
    role: 'listbox' as const,
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
  };

  return {
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
  };
}
