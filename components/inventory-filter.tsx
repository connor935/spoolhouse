'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { FILAMENT_TYPES } from '@/lib/filament';
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
export function areFiltersActive(f: InventoryFilters): boolean {
  return (
    f.q.trim() !== '' ||
    f.filamentType !== null ||
    f.minLeftGrams !== null ||
    f.hideLent
  );
}

// The advanced filters that live behind the mobile "Filters" toggle.
function isAdvancedActive(f: InventoryFilters): boolean {
  return f.filamentType !== null || f.minLeftGrams !== null || f.hideLent;
}

const ALL_TYPES = '__all__';
const TYPE_ITEMS = [
  { value: ALL_TYPES, label: 'All types' },
  ...FILAMENT_TYPES.map((t) => ({ value: t, label: t })),
];

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
    <div className="border-border bg-card flex flex-1 flex-col gap-3 rounded-lg border px-3 py-3 sm:px-4">
      {/* Always visible: search + status + (mobile) Filters toggle + Clear */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative min-w-40 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            value={value.q}
            onChange={(e) => onChange({ ...value, q: e.target.value })}
            placeholder="Search material or manufacturer…"
            className="h-9 pl-8"
            aria-label="Search materials"
          />
        </div>

        {showStatus && (
          <Select
            items={statusItems}
            value={value.status}
            onValueChange={(v) =>
              v && onChange({ ...value, status: v as StockStatus })
            }
          >
            <SelectTrigger
              className="h-9 w-32"
              aria-label="Filter by stock status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="relative h-9 md:hidden"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          <SlidersHorizontal className="mr-1 h-4 w-4" />
          Filters
          {isAdvancedActive(value) && (
            <span className="bg-accent absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full" />
          )}
        </Button>

        {areFiltersActive(value) && (
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
          'flex-wrap items-center gap-3',
          expanded ? 'flex' : 'hidden',
          'md:flex'
        )}
      >
        <Select
          items={TYPE_ITEMS}
          value={value.filamentType ?? ALL_TYPES}
          onValueChange={(v) =>
            v &&
            onChange({ ...value, filamentType: v === ALL_TYPES ? null : v })
          }
        >
          <SelectTrigger className="h-9" aria-label="Filter by filament type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
              const parsed = Math.trunc(Number(e.target.value));
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
