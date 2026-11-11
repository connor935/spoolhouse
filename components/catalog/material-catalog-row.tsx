'use client';

import { Badge } from '@/components/ui/badge';
import { LegacyCatalogRow } from '@/components/catalog/legacy-catalog-row';
import { EditMaterialDialog } from '@/components/catalog/edit-material-dialog';
import { MaterialPropertiesSection } from '@/components/materials/material-properties-section';
import {
  approveMaterial,
  deleteMaterial,
  rejectMaterial,
  type MaterialWithUsage,
} from '@/app/actions/materials';
import type { Material, Property } from '@/lib/db/schema';
import type { MaterialPropertyView } from '@/lib/material-properties';
import { DEFAULT_MATERIAL_COLOR } from '@/lib/filament';

export function MaterialCatalogRow({
  material,
  currentUserId,
  isAdmin = false,
  properties,
  definitions,
}: {
  material: Material | MaterialWithUsage;
  currentUserId: string;
  isAdmin?: boolean;
  properties: MaterialPropertyView[];
  definitions: Property[];
}) {
  const spoolCount = 'spoolCount' in material ? material.spoolCount : 0;

  return (
    <LegacyCatalogRow
      entity={material}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      noun="material"
      spoolCount={spoolCount}
      leading={
        <span
          className="border-border h-5 w-5 shrink-0 rounded-full border shadow-inner"
          style={{ backgroundColor: material.color ?? DEFAULT_MATERIAL_COLOR }}
          aria-hidden
        />
      }
      meta={
        <Badge variant="secondary" className="font-mono text-xs">
          {material.filamentType}
        </Badge>
      }
      approve={approveMaterial}
      reject={rejectMaterial}
      remove={deleteMaterial}
      renderEditDialog={(open, onOpenChange) => (
        <EditMaterialDialog
          material={material}
          isAdmin={isAdmin}
          open={open}
          onOpenChange={onOpenChange}
        />
      )}
      details={
        <MaterialPropertiesSection
          materialId={material.id}
          values={properties}
          definitions={definitions}
          isAdmin={isAdmin}
        />
      }
    />
  );
}
