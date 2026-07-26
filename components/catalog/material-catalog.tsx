'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Catalog } from '@/components/catalog/catalog';
import { MaterialCatalogRow } from '@/components/catalog/material-catalog-row';
import { MaterialPropertyFilter } from '@/components/materials/material-property-filter';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { MaterialWithUsage } from '@/app/actions/materials';
import { ALL_TYPES, TYPE_ITEMS } from '@/lib/catalog-filter-items';
import type { MaterialPropertyView } from '@/lib/material-properties';
import {
  anyConstraintActive,
  serializeConstraints,
  type PropertyConstraint,
} from '@/lib/property-filter';
import type { Material, Property } from '@/lib/db/schema';

// Filters that are resolved server-side, mirrored in the URL.
export type MaterialCatalogFilters = {
  q: string;
  filamentType: string | null;
  status: string | null;
  constraints: PropertyConstraint[];
};

// The catalog is searched in SQL (see lib/material-search.ts) because a
// SpoolmanDB import pushes it to tens of thousands of rows. Filter state lives
// in the URL, so each change is a server round-trip that returns one page of
// results — and the property-range filter spans the whole catalog rather than
// whatever happened to be loaded.
export function MaterialCatalog({
  materials,
  total,
  grandTotal,
  pendingCount,
  filters,
  currentUserId,
  isAdmin = false,
  propertiesByMaterialId,
  propertyDefinitions,
}: {
  materials: (Material | MaterialWithUsage)[];
  total: number;
  grandTotal: number;
  pendingCount?: number;
  filters: MaterialCatalogFilters;
  currentUserId: string;
  isAdmin?: boolean;
  propertiesByMaterialId: Record<string, MaterialPropertyView[]>;
  propertyDefinitions: Property[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, startTransition] = useTransition();

  // The search box stays responsive locally; only the debounced value navigates.
  const [queryInput, setQueryInput] = useState(filters.q);
  const debouncedQuery = useDebouncedValue(queryInput, 300);

  function apply(next: Partial<MaterialCatalogFilters>) {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.q.trim()) params.set('q', merged.q.trim());
    if (merged.filamentType) params.set('type', merged.filamentType);
    if (merged.status) params.set('status', merged.status);
    const props = serializeConstraints(merged.constraints);
    if (props) params.set('props', props);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  useEffect(() => {
    if (debouncedQuery.trim() === filters.q.trim()) return;
    apply({ q: debouncedQuery });
    // `apply` closes over the current filters; re-running on those would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  return (
    <Catalog
      items={materials}
      total={total}
      grandTotal={grandTotal}
      pendingCount={pendingCount}
      query={queryInput}
      onQueryChange={setQueryInput}
      status={filters.status}
      onStatusChange={(status) => apply({ status })}
      busy={busy}
      isAdmin={isAdmin}
      searchPlaceholder="Search manufacturer, material or color…"
      searchAriaLabel="Search materials"
      emptyText="No materials match your search."
      extraFilter={{
        value: filters.filamentType,
        onChange: (filamentType) => apply({ filamentType }),
        items: TYPE_ITEMS,
        allValue: ALL_TYPES,
        ariaLabel: 'Filter by filament type',
        triggerClassName: 'h-9 w-36',
      }}
      extraControls={
        <MaterialPropertyFilter
          definitions={propertyDefinitions}
          constraints={filters.constraints}
          onChange={(constraints) => apply({ constraints })}
        />
      }
      extraActive={anyConstraintActive(filters.constraints)}
      onClearExtra={() => {
        setQueryInput('');
        apply({ q: '', filamentType: null, status: null, constraints: [] });
      }}
      renderRow={(m) => (
        <MaterialCatalogRow
          key={m.id}
          material={m}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          properties={propertiesByMaterialId[m.id] ?? []}
          definitions={propertyDefinitions}
        />
      )}
    />
  );
}
