'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  constraintActive,
  type PropertyConstraint,
} from '@/lib/property-filter';
import type { Property } from '@/lib/db/schema';

// Faceted property filter (Alternate-style): every datasheet property is its
// own collapsible facet with a numeric min/max range, rather than an
// add-one-at-a-time flow. State is still PropertyConstraint[] (at most one per
// property), so the predicate + URL sync are unchanged. Controlled by the
// parent (catalog / dashboard filter).
export function MaterialPropertyFilter({
  definitions,
  constraints,
  onChange,
  bare = false,
}: {
  definitions: Property[];
  constraints: PropertyConstraint[];
  onChange: (next: PropertyConstraint[]) => void;
  bare?: boolean;
}) {
  // Facets with an active bound start expanded so set filters are visible.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(constraints.filter(constraintActive).map((c) => c.propertyId))
  );

  if (definitions.length === 0) return null;

  function toggle(propertyId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
  }

  function bound(propertyId: string): PropertyConstraint | undefined {
    return constraints.find((c) => c.propertyId === propertyId);
  }

  function parseBound(raw: string): number | null {
    const n = Number.parseFloat(raw);
    return raw.trim() === '' || Number.isNaN(n) ? null : n;
  }

  function setBound(propertyId: string, which: 'min' | 'max', raw: string) {
    const val = parseBound(raw);
    const existing = bound(propertyId);
    const min = which === 'min' ? val : (existing?.min ?? null);
    const max = which === 'max' ? val : (existing?.max ?? null);
    const others = constraints.filter((c) => c.propertyId !== propertyId);
    if (min === null && max === null) {
      onChange(others);
      return;
    }
    onChange([...others, { id: propertyId, propertyId, min, max }]);
  }

  return (
    <div
      className={
        bare
          ? 'flex w-full flex-col gap-2'
          : 'border-border bg-card flex flex-col gap-2 rounded-lg border px-3 py-3 sm:px-4'
      }
    >
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Filter by property
      </span>
      <ul className="border-border divide-border divide-y rounded-md border">
        {definitions.map((def) => {
          const c = bound(def.id);
          const isActive = !!c && (c.min !== null || c.max !== null);
          const isOpen = expanded.has(def.id);
          return (
            <li key={def.id}>
              <button
                type="button"
                onClick={() => toggle(def.id)}
                aria-expanded={isOpen}
                className="hover:bg-secondary/40 flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
              >
                <span className="flex items-center gap-2">
                  {def.name}
                  {def.unit && (
                    <span className="text-muted-foreground text-xs">
                      ({def.unit})
                    </span>
                  )}
                  {isActive && (
                    <span
                      className="bg-accent h-1.5 w-1.5 rounded-full"
                      aria-label="Active filter"
                    />
                  )}
                </span>
                <ChevronDown
                  className={cn(
                    'text-muted-foreground h-4 w-4 shrink-0 transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
              {isOpen && (
                <div className="flex items-center gap-2 px-3 pt-0.5 pb-3">
                  <Input
                    type="number"
                    value={c?.min ?? ''}
                    onChange={(e) => setBound(def.id, 'min', e.target.value)}
                    placeholder="min"
                    className="h-9 w-24 font-mono"
                    aria-label={`Minimum ${def.name}`}
                  />
                  <span className="text-muted-foreground text-sm">–</span>
                  <Input
                    type="number"
                    value={c?.max ?? ''}
                    onChange={(e) => setBound(def.id, 'max', e.target.value)}
                    placeholder="max"
                    className="h-9 w-24 font-mono"
                    aria-label={`Maximum ${def.name}`}
                  />
                  {def.unit && (
                    <span className="text-muted-foreground text-xs">
                      {def.unit}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
