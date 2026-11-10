'use client';

import { SlidersHorizontalIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import {
  FilterFields,
  type FilterFieldsProps,
} from '@/components/common/filter-fields';
import { Button } from '@/components/ui/button';
import { countActiveFilters, EMPTY_FILTER_VALUE } from '@/lib/filter-value';
import { cn } from '@/lib/utils';

type FilterPanelProps = FilterFieldsProps &
  Omit<ComponentProps<'section'>, 'onChange'>;

/**
 * Desktop filters (Patterns board, section 01): expands under the toolbar,
 * toggled by <FiltersButton>. Controlled; the page mirrors the value into the
 * URL. Pass an `id` and point the button's `aria-controls` at it.
 */
function FilterPanel({
  value,
  onChange,
  filamentTypes,
  showMinLeft,
  showHideLent,
  properties,
  className,
  ...props
}: FilterPanelProps) {
  return (
    <section
      data-slot="filter-panel"
      aria-label="Filters"
      className={cn(
        'border-ink bg-card rounded-[4px] border p-[18px]',
        className
      )}
      {...props}
    >
      <FilterFields
        layout="panel"
        value={value}
        onChange={onChange}
        filamentTypes={filamentTypes}
        showMinLeft={showMinLeft}
        showHideLent={showHideLent}
        properties={properties}
      />
      <div className="mt-3.5 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          disabled={countActiveFilters(value) === 0}
          onClick={() => onChange(EMPTY_FILTER_VALUE)}
        >
          Clear all
        </Button>
      </div>
    </section>
  );
}

type FiltersButtonProps = ComponentProps<typeof Button> & {
  /** Active filters (countActiveFilters), shown as an accent pill. */
  count: number;
  open: boolean;
};

/** The toolbar's "Filters" toggle; inverted while the panel is open. */
function FiltersButton({
  count,
  open,
  children,
  ...props
}: FiltersButtonProps) {
  return (
    <Button
      data-slot="filters-button"
      variant={open ? 'default' : 'outline'}
      aria-expanded={open}
      {...props}
    >
      <SlidersHorizontalIcon aria-hidden />
      {children ?? 'Filters'}
      {/* The space keeps "Filters 2 active" apart in the accessible name;
          the flex gap handles it visually. */}
      {count > 0 && ' '}
      {count > 0 && (
        <span className="bg-accent text-accent-foreground h-5 min-w-5 rounded-full px-1.5 text-center font-mono text-[11px] leading-5 font-semibold">
          {count} <span className="sr-only">active</span>
        </span>
      )}
    </Button>
  );
}

export { FilterPanel, FiltersButton };
