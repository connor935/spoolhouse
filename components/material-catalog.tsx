'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { MaterialCatalogRow } from '@/components/material-catalog-row';
import type { MaterialWithUsage } from '@/app/actions/materials';
import { FILAMENT_TYPES } from '@/lib/filament';
import type { Material } from '@/lib/db/schema';

// The catalog can hold thousands of rows (SpoolmanDB import), so search + a
// filament-type filter, grouped by manufacturer, and cap the rendered rows.
const MAX_ROWS = 150;
const ALL_TYPES = '__all__';
const TYPE_ITEMS = [
  { value: ALL_TYPES, label: 'All types' },
  ...FILAMENT_TYPES.map((t) => ({ value: t, label: t })),
];
const ALL_STATUS = '__all__';
const STATUS_ITEMS = [
  { value: ALL_STATUS, label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'approved', label: 'Approved' },
];

export function MaterialCatalog({
  materials,
  currentUserId,
  isAdmin = false,
}: {
  materials: (Material | MaterialWithUsage)[];
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string | null>(null);
  // Admin-only review queue filter (All / Pending / Rejected / Approved).
  const [status, setStatus] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materials.filter((m) => {
      if (type && m.filamentType !== type) return false;
      if (status && m.status !== status) return false;
      if (q === '') return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q)
      );
    });
  }, [materials, query, type, status]);

  const groups = useMemo(() => {
    const map = new Map<string, (Material | MaterialWithUsage)[]>();
    for (const m of filtered.slice(0, MAX_ROWS)) {
      const list = map.get(m.manufacturer) ?? [];
      list.push(m);
      map.set(m.manufacturer, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const pendingCount = useMemo(
    () => materials.filter((m) => m.status === 'pending').length,
    [materials]
  );
  const active = query.trim() !== '' || type !== null || status !== null;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="border-border bg-card flex flex-wrap items-center gap-2 rounded-lg border px-3 py-3 sm:gap-3 sm:px-4">
        <div className="relative min-w-40 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or manufacturer…"
            className="h-9 pl-8"
            aria-label="Search materials"
          />
        </div>
        <Select
          items={TYPE_ITEMS}
          value={type ?? ALL_TYPES}
          onValueChange={(v) => v && setType(v === ALL_TYPES ? null : v)}
        >
          <SelectTrigger className="h-9 w-36" aria-label="Filter by filament type">
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
        {isAdmin && (
          <>
            <Select
              items={STATUS_ITEMS}
              value={status ?? ALL_STATUS}
              onValueChange={(v) =>
                v && setStatus(v === ALL_STATUS ? null : v)
              }
            >
              <SelectTrigger className="h-9 w-36" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pendingCount > 0 && status !== 'pending' && (
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                onClick={() => setStatus('pending')}
              >
                Review pending ({pendingCount})
              </Button>
            )}
          </>
        )}
        {active && (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground h-9"
            onClick={() => {
              setQuery('');
              setType(null);
              setStatus(null);
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
        <span className="text-muted-foreground ml-auto text-xs whitespace-nowrap">
          {filtered.length} of {materials.length}
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="border-border bg-card/50 text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
          No materials match your search.
        </div>
      ) : (
        groups.map(([manufacturer, list]) => (
          <section
            key={manufacturer}
            className="border-border bg-card rounded-lg border"
          >
            <h2 className="border-border border-b px-6 py-3 font-semibold">
              {manufacturer}
            </h2>
            <ul className="divide-border divide-y">
              {list.map((m) => (
                <MaterialCatalogRow
                  key={m.id}
                  material={m}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      {filtered.length > MAX_ROWS && (
        <p className="text-muted-foreground text-center text-xs">
          Showing first {MAX_ROWS} of {filtered.length} — refine your search.
        </p>
      )}
    </div>
  );
}
