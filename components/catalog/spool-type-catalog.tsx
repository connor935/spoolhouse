'use client';

import { Catalog } from '@/components/catalog';
import { SpoolTypeCatalogRow } from '@/components/spool-type-catalog-row';
import type { SpoolTypeWithUsage } from '@/app/actions/spool-types';
import type { SpoolType } from '@/lib/db/schema';

export function SpoolTypeCatalog({
  spoolTypes,
  currentUserId,
  isAdmin = false,
}: {
  spoolTypes: (SpoolType | SpoolTypeWithUsage)[];
  currentUserId: string;
  isAdmin?: boolean;
}) {
  return (
    <Catalog
      items={spoolTypes}
      isAdmin={isAdmin}
      searchPlaceholder="Search spool type or manufacturer…"
      searchAriaLabel="Search spool types"
      emptyText="No spool types match your search."
      renderRow={(t) => (
        <SpoolTypeCatalogRow
          key={t.id}
          spoolType={t}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      )}
    />
  );
}
