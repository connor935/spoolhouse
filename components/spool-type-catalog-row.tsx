'use client';

import { CatalogRow } from '@/components/catalog-row';
import { EditSpoolTypeDialog } from '@/components/edit-spool-type-dialog';
import {
  approveSpoolType,
  deleteSpoolType,
  rejectSpoolType,
  type SpoolTypeWithUsage,
} from '@/app/actions/spool-types';
import type { SpoolType } from '@/lib/db/schema';

export function SpoolTypeCatalogRow({
  spoolType,
  currentUserId,
  isAdmin = false,
}: {
  spoolType: SpoolType | SpoolTypeWithUsage;
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const spoolCount = 'spoolCount' in spoolType ? spoolType.spoolCount : 0;

  return (
    <CatalogRow
      entity={spoolType}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      noun="spool type"
      spoolCount={spoolCount}
      meta={
        <span className="text-muted-foreground font-mono text-sm tabular-nums">
          {spoolType.emptyWeightGrams} g
        </span>
      }
      approve={approveSpoolType}
      reject={rejectSpoolType}
      remove={deleteSpoolType}
      renderEditDialog={(open, onOpenChange) => (
        <EditSpoolTypeDialog
          spoolType={spoolType}
          isAdmin={isAdmin}
          open={open}
          onOpenChange={onOpenChange}
        />
      )}
    />
  );
}
