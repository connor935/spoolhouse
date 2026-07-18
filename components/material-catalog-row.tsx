'use client';

import { Badge } from '@/components/ui/badge';
import { CatalogRow } from '@/components/catalog-row';
import { EditMaterialDialog } from '@/components/edit-material-dialog';
import {
  approveMaterial,
  deleteMaterial,
  rejectMaterial,
  type MaterialWithUsage,
} from '@/app/actions/materials';
import type { Material } from '@/lib/db/schema';
import { DEFAULT_MATERIAL_COLOR } from '@/lib/filament';

export function MaterialCatalogRow({
  material,
  currentUserId,
  isAdmin = false,
}: {
  material: Material | MaterialWithUsage;
  currentUserId: string;
  // Admin rows get edit-any + approve/reject (pending) + delete.
  isAdmin?: boolean;
}) {
  const spoolCount = 'spoolCount' in material ? material.spoolCount : 0;

  return (
    <CatalogRow
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
    />
  );
}
