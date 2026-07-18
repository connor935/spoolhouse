'use client';

import { useState } from 'react';
import { Catalog } from '@/components/catalog';
import { MaterialCatalogRow } from '@/components/material-catalog-row';
import type { MaterialWithUsage } from '@/app/actions/materials';
import { ALL_TYPES, TYPE_ITEMS } from '@/lib/catalog-filter-items';
import type { Material } from '@/lib/db/schema';

export function MaterialCatalog({
  materials,
  currentUserId,
  isAdmin = false,
}: {
  materials: (Material | MaterialWithUsage)[];
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const [type, setType] = useState<string | null>(null);

  return (
    <Catalog
      items={materials}
      isAdmin={isAdmin}
      searchPlaceholder="Search name or manufacturer…"
      searchAriaLabel="Search materials"
      emptyText="No materials match your search."
      extraFilter={{
        value: type,
        onChange: setType,
        items: TYPE_ITEMS,
        allValue: ALL_TYPES,
        ariaLabel: 'Filter by filament type',
        triggerClassName: 'h-9 w-36',
        matches: (m, v) => m.filamentType === v,
      }}
      renderRow={(m) => (
        <MaterialCatalogRow
          key={m.id}
          material={m}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      )}
    />
  );
}
