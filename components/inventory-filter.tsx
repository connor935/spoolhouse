'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SlidersHorizontal, X } from 'lucide-react';
import { SearchInput } from '@/components/search-input';
import { SelectField } from '@/components/select-field';
import { ALL_TYPES, TYPE_ITEMS } from '@/lib/catalog-filter-items';
import { cn } from '@/lib/utils';

export type StockStatus = 'in-stock' | 'empty' | 'all';

export type InventoryFilters = {
  q: string;
  status: StockStatus; // which spools are shown (was the in-stock/empty/all tabs)
  filamentType: string | null; // null = all types
  minLeftGrams: number | null;
  hideLent: boolean; // only meaningful on group tabs
};

export const EMPTY_FILTERS: InventoryFilters = {
  q: '',
  status: 'in-stock',
  filamentType: null,
  minLeftGrams: null,
  hideLent: false,
};

// `status` is a view selector, not a removable filter chip — deliberately excluded.
export function filtersActive(f: InventoryFilters): boolean {
  return (
    f.q.trim() !== '' ||
    f.filamentType !== null ||
    f.minLeftGrams !== null ||
    f.hideLent
  );
}

// The advanced filters that live behind the mobile "Filters" toggle.
function advancedActive(f: InventoryFilters): boolean {
  return f.filamentType !== null || f.minLeftGrams !== null || f.hideLent;
}

export type StatusCounts = { inStock: number; empty: number; all: number };

export function InventoryFilter({
  value,
  onChange,
  showHideLent,
  showStatus,
  statusCounts,
}: {
  value: InventoryFilters;
  onChange: (next: InventoryFilters) => void;
  showHideLent: boolean;
  showStatus: boolean;
  statusCounts?: StatusCounts;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusItems = [
    {
      value: 'in-stock',
      label: statusCounts ? `In stock (${statusCounts.inStock})` : 'In stock',
    },
    {
      value: 'empty',
      label: statusCounts ? `Empty (${statusCounts.empty})` : 'Empty',
    },
    { value: 'all', label: statusCounts ? `All (${statusCounts.all})` : 'All' },
  ];

  return (
    <div className="border-border bg-card flex w-full flex-1 flex-col gap-3 rounded-lg border px-3 py-3 sm:px-4">
      {/* Always visible: search + status + (mobile) Filters toggle + Clear */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <SearchInput
          value={value.q}
          onChange={(q) => onChange({ ...value, q })}
          placeholder="Search material or manufacturer…"
          ariaLabel="Search materials"
        />

        <Button
          type="button"
          size="sm"
          variant={expanded ? 'default' : 'outline'}
          className="relative h-9"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          <SlidersHorizontal className="mr-1 h-4 w-4" />
          Filters
          {advancedActive(value) && (
            <span className="bg-accent absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full" />
          )}
        </Button>

        {filtersActive(value) && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground h-9"
            onClick={() => onChange({ ...EMPTY_FILTERS, status: value.status })}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced: type + min-left (+ hide-lent). Collapsed on mobile, inline on desktop. */}
      <div
        className={cn(
          'border-border flex-wrap items-center gap-4 border-t pt-3',
          expanded ? 'flex' : 'hidden'
        )}
      >
        {showStatus && (
          <SelectField
            items={statusItems}
            value={value.status}
            onValueChange={(v) =>
              onChange({ ...value, status: v as StockStatus })
            }
            triggerClassName="h-9 w-32"
            ariaLabel="Filter by stock status"
          />
        )}
        <SelectField
          items={TYPE_ITEMS}
          value={value.filamentType ?? ALL_TYPES}
          onValueChange={(v) =>
            onChange({ ...value, filamentType: v === ALL_TYPES ? null : v })
          }
          triggerClassName="h-9"
          ariaLabel="Filter by filament type"
        />

        <div className="flex items-center gap-2">
          <Label
            htmlFor="min-left"
            className="text-muted-foreground text-xs whitespace-nowrap"
          >
            Min. left (g)
          </Label>
          <Input
            id="min-left"
            type="number"
            step="1"
            min="0"
            value={
              value.minLeftGrams === null ? '' : String(value.minLeftGrams)
            }
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              onChange({
                ...value,
                minLeftGrams: Number.isNaN(parsed) ? null : parsed,
              });
            }}
            placeholder="e.g. 300"
            className="h-9 w-24 font-mono"
          />
        </div>

        {showHideLent && (
          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            <input
              type="checkbox"
              checked={value.hideLent}
              onChange={(e) =>
                onChange({ ...value, hideLent: e.target.checked })
              }
              className="border-input h-4 w-4 rounded"
            />
            Hide lent spools
          </label>
        )}
      </div>
    </div>
  );
}
