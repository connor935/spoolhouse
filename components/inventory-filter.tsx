'use client';

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
import { Search, X } from 'lucide-react';
import { FILAMENT_TYPES } from '@/lib/filament';

export type InventoryFilters = {
  q: string;
  filamentType: string | null; // null = all types
  minLeftGrams: number | null;
  hideLent: boolean; // only meaningful on group tabs
};

export const EMPTY_FILTERS: InventoryFilters = {
  q: '',
  filamentType: null,
  minLeftGrams: null,
  hideLent: false,
};

export function filtersActive(f: InventoryFilters): boolean {
  return (
    f.q.trim() !== '' ||
    f.filamentType !== null ||
    f.minLeftGrams !== null ||
    f.hideLent
  );
}

const ALL_TYPES = '__all__';
const TYPE_ITEMS = [
  { value: ALL_TYPES, label: 'All types' },
  ...FILAMENT_TYPES.map((t) => ({ value: t, label: t })),
];

export function InventoryFilter({
  value,
  onChange,
  showHideLent,
}: {
  value: InventoryFilters;
  onChange: (next: InventoryFilters) => void;
  showHideLent: boolean;
}) {
  return (
    <div className="border-border bg-card flex flex-1 flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
      <div className="relative min-w-48 flex-1">
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

      <Select
        items={TYPE_ITEMS}
        value={value.filamentType ?? ALL_TYPES}
        onValueChange={(v) =>
          v && onChange({ ...value, filamentType: v === ALL_TYPES ? null : v })
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
          value={value.minLeftGrams === null ? '' : String(value.minLeftGrams)}
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
            onChange={(e) => onChange({ ...value, hideLent: e.target.checked })}
            className="border-input h-4 w-4 rounded"
          />
          Hide lent spools
        </label>
      )}

      {filtersActive(value) && (
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
