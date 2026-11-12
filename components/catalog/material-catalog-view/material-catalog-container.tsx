'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import {
  requestMaterial,
  searchMaterialCatalog,
  type MaterialCatalogEntry,
} from '@/app/actions/materials';
import { MaterialEntryForm } from '@/components/catalog/material-entry-form';
import type { FilterProperty } from '@/components/common/filter-fields';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useUrlSearchQuery } from '@/hooks/use-url-search-query';
import {
  materialCatalogSearch,
  type MaterialCatalogFilters,
} from '@/lib/catalog-params';
import { groupByManufacturer } from '@/lib/catalog-groups';
import { EMPTY_FILTER_VALUE, type FilterValue } from '@/lib/filter-value';
import { requestEntityToast } from '@/lib/request-entity-toast';
import { uniqueBy } from '@/lib/unique-by';

import { MaterialCatalogView } from './material-catalog-view';

const PAGE_SIZE = 150;

type MaterialCatalogContainerProps = {
  filters: MaterialCatalogFilters;
  firstPage: {
    entries: MaterialCatalogEntry[];
    total: number;
    manufacturerTotals: Record<string, number>;
  };
  /** Materials the viewer can see at all. */
  grandTotal: number;
  properties: readonly FilterProperty[];
  viewerId: string;
  autoApprove: boolean;
  recentColors: string[];
};

// Wires /materials: filters live in the URL (the server page re-queries on
// every change), the search box navigates debounced, Load more appends the
// next page via the same server action, and the request panel calls
// requestMaterial. Appended pages carry the search they belong to and are
// dropped as soon as the filters change.
function MaterialCatalogContainer({
  filters,
  firstPage,
  grandTotal,
  properties,
  viewerId,
  autoApprove,
  recentColors,
}: MaterialCatalogContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const compact = useIsMobile();
  const [busy, startTransition] = React.useTransition();
  // Extra pages belong to the first page they extend: any server refresh
  // (new filters, a request, router.refresh) brings a new one and drops them.
  const [appended, setAppended] = React.useState<{
    base: MaterialCatalogEntry[];
    entries: MaterialCatalogEntry[];
    totals: Record<string, number>;
  } | null>(null);
  const more = appended?.base === firstPage.entries ? appended : null;
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [requesting, setRequesting] = React.useState(false);

  const navigate = React.useCallback(
    (next: MaterialCatalogFilters) => {
      const search = materialCatalogSearch(next);
      startTransition(() => {
        router.replace(search ? `${pathname}?${search}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router]
  );

  const { query, setQuery, reset } = useUrlSearchQuery(
    filters.q,
    (q) => navigate({ ...filters, q }),
    busy
  );

  const filter: FilterValue = {
    ...EMPTY_FILTER_VALUE,
    filamentTypes: filters.filamentTypes,
    propertyConstraints: filters.constraints,
  };

  const entries = uniqueBy(
    [...firstPage.entries, ...(more?.entries ?? [])],
    (e) => e.material.id
  );
  const groups = groupByManufacturer(
    entries.map((e) => ({ ...e, own: e.material.submittedById === viewerId })),
    (e) => e.material.manufacturer,
    { ...firstPage.manufacturerTotals, ...more?.totals }
  );

  async function loadMore() {
    setLoadingMore(true);
    try {
      const page = await searchMaterialCatalog({
        q: filters.q,
        filamentTypes: filters.filamentTypes,
        constraints: filters.constraints,
        limit: PAGE_SIZE,
        offset: entries.length,
      });
      setAppended({
        base: firstPage.entries,
        entries: [...(more?.entries ?? []), ...page.entries],
        totals: { ...more?.totals, ...page.manufacturerTotals },
      });
    } catch {
      toast.error('Could not load more materials — try again');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <MaterialCatalogView
      groups={groups}
      matching={firstPage.total}
      total={grandTotal}
      query={query}
      onQueryChange={setQuery}
      filter={filter}
      onFilterChange={(next) =>
        navigate({
          ...filters,
          q: query,
          filamentTypes: next.filamentTypes,
          constraints: next.propertyConstraints,
        })
      }
      properties={properties}
      onClear={() => {
        reset('');
        navigate({ q: '', filamentTypes: [], status: null, constraints: [] });
      }}
      busy={busy}
      onLoadMore={loadMore}
      loadingMore={loadingMore}
      autoApprove={autoApprove}
      requestOpen={requestOpen}
      onRequestOpenChange={setRequestOpen}
      compact={compact}
      requestForm={
        <MaterialEntryForm
          mode="request"
          autoApprove={autoApprove}
          recentColors={recentColors}
          pending={requesting}
          onCancel={() => setRequestOpen(false)}
          onSubmit={async (values) => {
            setRequesting(true);
            try {
              const created = await requestMaterial(values);
              requestEntityToast('Material', created);
              setRequestOpen(false);
              router.refresh();
            } catch {
              toast.error(
                'Could not request the material — check the fields and try again'
              );
            } finally {
              setRequesting(false);
            }
          }}
        />
      }
    />
  );
}

export { MaterialCatalogContainer };
