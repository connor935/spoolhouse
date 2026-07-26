'use client';

import { useEffect } from 'react';
import { serializeConstraints } from '@/lib/property-filter';
import type { InventoryFilters } from '@/components/dashboard/inventory-filter';

// Mirrors the dashboard's tab + filter state into the URL (replaceState: no
// navigation/server round-trip per keystroke, back button stays sane) so the
// current view is shareable and restorable from a link.
export function useUrlSyncedFilters(tab: string, filters: InventoryFilters) {
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== 'stock') params.set('tab', tab);
    if (filters.status !== 'in-stock') params.set('status', filters.status);
    if (filters.q.trim() !== '') params.set('q', filters.q.trim());
    if (filters.filamentType) params.set('type', filters.filamentType);
    if (filters.minLeftGrams !== null)
      params.set('minLeft', String(filters.minLeftGrams));
    if (filters.hideLent) params.set('hideLent', '1');
    const props = serializeConstraints(filters.propertyConstraints);
    if (props) params.set('props', props);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `/?${qs}` : '/');
  }, [tab, filters]);
}
