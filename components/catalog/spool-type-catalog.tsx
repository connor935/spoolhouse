'use client';

import { useMemo, useState } from 'react';
import { Catalog } from '@/components/catalog/catalog';
import { SpoolTypeCatalogRow } from '@/components/catalog/spool-type-catalog-row';
import type { SpoolTypeWithUsage } from '@/app/actions/spool-types';
import type { SpoolType } from '@/lib/db/schema';
import { matchesTokens, searchTokens } from '@/lib/search';

// Spool types stay a short list even after a SpoolmanDB import (one per
// manufacturer × weight), so this catalog keeps filtering client-side over the
// full list — unlike materials, which are searched in SQL.
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
    const tokens = searchTokens(query.trim());
    return spoolTypes.filter((t) => {
      if (status && t.status !== status) return false;
      return matchesTokens(tokens, t.manufacturer, t.name);
    });
  }, [spoolTypes, query, status]);

  const pendingCount = useMemo(
    () => spoolTypes.filter((t) => t.status === 'pending').length,
    [spoolTypes]
  );

  return (
    <Catalog
      items={filtered}
      total={filtered.length}
      grandTotal={spoolTypes.length}
      pendingCount={pendingCount}
      query={query}
      onQueryChange={setQuery}
      status={status}
      onStatusChange={setStatus}
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
