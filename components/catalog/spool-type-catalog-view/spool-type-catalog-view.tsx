'use client';

import * as React from 'react';

import { CatalogPage } from '@/components/catalog/catalog-page';
import { CatalogRow } from '@/components/catalog/catalog-row';
import { CatalogToolbar } from '@/components/catalog/catalog-toolbar';
import { ManufacturerHeader } from '@/components/catalog/manufacturer-header';
import { EmptyState } from '@/components/common/empty-state';
import { groupByManufacturer } from '@/lib/catalog-groups';
import type { SpoolType } from '@/lib/db/schema';
import { matchesTokens, searchTokens } from '@/lib/search';

export type SpoolTypeCatalogRowData = SpoolType & {
  /** Spools of anyone on this type. */
  spoolCount: number;
};

type SpoolTypeCatalogViewProps = {
  spoolTypes: SpoolTypeCatalogRowData[];
  viewerId: string;
  query: string;
  onQueryChange: (query: string) => void;
  /** The viewer's own pending/rejected rows open their edit dialog. */
  onEdit?: (spoolType: SpoolType) => void;
  autoApprove: boolean;
  requestOpen: boolean;
  onRequestOpenChange: (open: boolean) => void;
  requestForm: React.ReactNode;
  compact?: boolean;
};

/** Rows rendered at most; the search narrows the rest. */
const MAX_ROWS = 150;
const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * The /spool-types page (CatalogSpoolTypes board): search, rows grouped by
 * manufacturer with the empty weight and "In use · N", and the request side
 * panel. Spool types stay a short list even after a SpoolmanDB import (one
 * per manufacturer × weight), so filtering happens here, over the full list.
 */
function SpoolTypeCatalogView({
  spoolTypes,
  viewerId,
  query,
  onQueryChange,
  onEdit,
  autoApprove,
  requestOpen,
  onRequestOpenChange,
  requestForm,
  compact = false,
}: SpoolTypeCatalogViewProps) {
  const matches = React.useMemo(() => {
    const tokens = searchTokens(query.trim());
    return spoolTypes.filter((t) =>
      matchesTokens(tokens, t.manufacturer, t.name)
    );
  }, [spoolTypes, query]);
  const groups = groupByManufacturer(
    matches.slice(0, MAX_ROWS),
    (t) => t.manufacturer,
    Object.fromEntries(
      groupByManufacturer(matches, (t) => t.manufacturer).map((g) => [
        g.manufacturer,
        g.entries.length,
      ])
    )
  );
  const shown = Math.min(matches.length, MAX_ROWS);

  return (
    <CatalogPage
      index="07"
      title="Spool types"
      totalEntries={spoolTypes.length}
      description={
        autoApprove
          ? "Global spool types and their empty weights. Missing one? Add it — as an admin it's published straight away."
          : 'Global spool types and their empty weights. Missing one? Request it — you can use it immediately while an admin reviews it.'
      }
      requestLabel={autoApprove ? 'Add spool type' : 'Request spool type'}
      requestTitle={
        autoApprove ? 'Add a new spool type' : 'Request a new spool type'
      }
      requestOpen={requestOpen}
      onRequestOpenChange={onRequestOpenChange}
      requestForm={requestForm}
      compact={compact}
    >
      <CatalogToolbar
        query={query}
        onQueryChange={onQueryChange}
        searchLabel="Search spool types"
        placeholder="Search spool type or manufacturer…"
        onClear={() => onQueryChange('')}
        matching={matches.length}
        total={spoolTypes.length}
        compact={compact}
      />
      {groups.length === 0 ? (
        <EmptyState
          title="No spool types match"
          description="Try fewer words. Missing one? Request it."
        />
      ) : (
        <div>
          {groups.map((group) => (
            <section key={group.manufacturer} aria-label={group.manufacturer}>
              <ManufacturerHeader
                name={group.manufacturer}
                count={group.total}
                compact={compact}
              />
              {group.entries.map((t) => {
                const own = t.submittedById === viewerId;
                const editable = own && t.status !== 'approved' && onEdit;
                return (
                  <CatalogRow
                    key={t.id}
                    entry={{
                      kind: 'spool-type',
                      spoolType: t,
                      inUseCount: t.spoolCount,
                    }}
                    own={own}
                    onOpen={editable ? () => onEdit(t) : undefined}
                  />
                );
              })}
            </section>
          ))}
        </div>
      )}
      <span className="kicker">
        Showing {shown < matches.length ? 'first ' : ''}
        {fmt(shown)} of {fmt(matches.length)}
        {shown < matches.length && ' — refine your search.'}
      </span>
    </CatalogPage>
  );
}

export { SpoolTypeCatalogView };
