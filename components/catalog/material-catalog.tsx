'use client';

import { useMemo, useState } from 'react';
import { Catalog } from '@/components/catalog';
import { MaterialCatalogRow } from '@/components/material-catalog-row';
import { MaterialPropertyFilter } from '@/components/material-property-filter';
import type { MaterialWithUsage } from '@/app/actions/materials';
import { ALL_TYPES, TYPE_ITEMS } from '@/lib/catalog-filter-items';
import type { MaterialPropertyView } from '@/lib/material-properties';
import {
  anyConstraintActive,
  materialMatchesConstraints,
  type PropertyConstraint,
} from '@/lib/property-filter';
import type { Material, Property } from '@/lib/db/schema';

export function MaterialCatalog({
  materials,
  currentUserId,
  isAdmin = false,
  propertiesByMaterialId,
  propertyDefinitions,
}: {
  materials: (Material | MaterialWithUsage)[];
  currentUserId: string;
  isAdmin?: boolean;
  propertiesByMaterialId: Record<string, MaterialPropertyView[]>;
  propertyDefinitions: Property[];
}) {
  const [type, setType] = useState<string | null>(null);
  const [constraints, setConstraints] = useState<PropertyConstraint[]>([]);

  const extraActive = anyConstraintActive(constraints);
  const extraPredicate = useMemo(
    () => (m: Material | MaterialWithUsage) =>
      materialMatchesConstraints(
        propertiesByMaterialId[m.id] ?? [],
        constraints
      ),
    [propertiesByMaterialId, constraints]
  );

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
      extraControls={
        <MaterialPropertyFilter
          definitions={propertyDefinitions}
          constraints={constraints}
          onChange={setConstraints}
        />
      }
      extraPredicate={extraActive ? extraPredicate : undefined}
      extraActive={extraActive}
      onClearExtra={() => setConstraints([])}
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
