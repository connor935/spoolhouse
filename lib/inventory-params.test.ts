import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INVENTORY_QUERY,
  inventorySearch,
  legacyDashboardRedirect,
  parseInventoryParams,
} from '@/lib/inventory-params';

describe('parseInventoryParams', () => {
  it('defaults to in-stock spools with no filters', () => {
    expect(parseInventoryParams({})).toEqual(DEFAULT_INVENTORY_QUERY);
  });

  it('reads status, search, types, minimum and property ranges', () => {
    const query = parseInventoryParams({
      status: 'empty',
      q: 'galaxy',
      type: 'PLA,PETG',
      minLeft: '300',
      props: 'p1:1.2:1.3',
    });
    expect(query).toMatchObject({
      status: 'empty',
      q: 'galaxy',
      filamentTypes: ['PLA', 'PETG'],
      minLeftGrams: 300,
      hideLent: false,
    });
    expect(query.propertyConstraints).toEqual([
      { id: 'c-url-0', propertyId: 'p1', min: 1.2, max: 1.3 },
    ]);
  });

  it('accepts old single-type links and URLSearchParams', () => {
    expect(
      parseInventoryParams(new URLSearchParams('type=PETG')).filamentTypes
    ).toEqual(['PETG']);
  });

  it('ignores unknown status values, unreadable numbers and blank types', () => {
    expect(
      parseInventoryParams({ status: 'bogus', minLeft: 'abc', type: ',,' })
    ).toEqual(DEFAULT_INVENTORY_QUERY);
  });

  it('ignores hideLent, which only applies to group stock', () => {
    expect(parseInventoryParams({ hideLent: '1' }).hideLent).toBe(false);
  });
});

describe('inventorySearch', () => {
  it('is empty for the default view', () => {
    expect(inventorySearch(DEFAULT_INVENTORY_QUERY)).toBe('');
  });

  it('round-trips through parseInventoryParams', () => {
    const query = {
      ...DEFAULT_INVENTORY_QUERY,
      status: 'all' as const,
      q: '  cotton white ',
      filamentTypes: ['PLA', 'ASA'],
      minLeftGrams: 250,
      propertyConstraints: [{ id: 'x', propertyId: 'p1', min: null, max: 3 }],
    };
    const search = inventorySearch(query);
    expect(search).toBe(
      '?status=all&q=cotton+white&type=PLA%2CASA&minLeft=250&props=p1%3A%3A3'
    );
    expect(
      parseInventoryParams(new URLSearchParams(search.slice(1)))
    ).toMatchObject({
      status: 'all',
      q: 'cotton white',
      filamentTypes: ['PLA', 'ASA'],
      minLeftGrams: 250,
    });
  });
});

describe('legacyDashboardRedirect', () => {
  it('keeps the plain overview where it is', () => {
    expect(legacyDashboardRedirect({})).toBeNull();
  });

  it('sends the old Borrows tab to /borrows', () => {
    expect(legacyDashboardRedirect({ tab: 'borrows' })).toBe('/borrows');
  });

  it('sends group tabs to the group page, old and new tab format', () => {
    expect(legacyDashboardRedirect({ tab: 'group-abc-123' })).toBe(
      '/groups/abc-123'
    );
    expect(legacyDashboardRedirect({ tab: 'abc-123', hideLent: '1' })).toBe(
      '/groups/abc-123'
    );
  });

  it('sends stock views and filter links to /inventory, filters kept', () => {
    expect(legacyDashboardRedirect({ tab: 'stock' })).toBe('/inventory');
    expect(
      legacyDashboardRedirect({ status: 'empty', q: 'pla', hideLent: '1' })
    ).toBe('/inventory?status=empty&q=pla');
    expect(legacyDashboardRedirect({ tab: 'stock', type: 'PETG' })).toBe(
      '/inventory?type=PETG'
    );
  });

  it('only redirects ids that look like ids', () => {
    expect(legacyDashboardRedirect({ tab: '../admin' })).toBeNull();
  });
});
