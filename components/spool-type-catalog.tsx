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
import { SpoolTypeCatalogRow } from '@/components/spool-type-catalog-row';
import type { SpoolTypeWithUsage } from '@/app/actions/spool-types';
import type { SpoolType } from '@/lib/db/schema';

const MAX_ROWS = 150;
const ALL_STATUS = '__all__';
const STATUS_ITEMS = [
  { value: ALL_STATUS, label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'approved', label: 'Approved' },
];

export function SpoolTypeCatalog({
  spoolTypes,
  currentUserId,
  isAdmin = false,
}: {
  spoolTypes: (SpoolType | SpoolTypeWithUsage)[];
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return spoolTypes.filter((t) => {
      if (status && t.status !== status) return false;
      if (q === '') return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.manufacturer.toLowerCase().includes(q)
      );
    });
  }, [spoolTypes, query, status]);

  const groups = useMemo(() => {
    const map = new Map<string, (SpoolType | SpoolTypeWithUsage)[]>();
    for (const t of filtered.slice(0, MAX_ROWS)) {
      const list = map.get(t.manufacturer) ?? [];
      list.push(t);
      map.set(t.manufacturer, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const pendingCount = useMemo(
    () => spoolTypes.filter((t) => t.status === 'pending').length,
    [spoolTypes]
  );
  const active = query.trim() !== '' || status !== null;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="border-border bg-card flex flex-wrap items-center gap-2 rounded-lg border px-3 py-3 sm:gap-3 sm:px-4">
        <div className="relative min-w-40 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search spool type or manufacturer…"
            className="h-9 pl-8"
            aria-label="Search spool types"
          />
        </div>
        {isAdmin && (
          <>
            <Select
              items={STATUS_ITEMS}
              value={status ?? ALL_STATUS}
              onValueChange={(v) => v && setStatus(v === ALL_STATUS ? null : v)}
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
              setStatus(null);
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
        <span className="text-muted-foreground ml-auto text-xs whitespace-nowrap">
          {filtered.length} of {spoolTypes.length}
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="border-border bg-card/50 text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
          No spool types match your search.
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
              {list.map((t) => (
                <SpoolTypeCatalogRow
                  key={t.id}
                  spoolType={t}
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
