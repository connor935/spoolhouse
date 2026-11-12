import { describe, expect, it } from 'vitest';
import type { Material } from '@/lib/db/schema';
import type { MaterialInventory, SpoolView } from '@/lib/filament';
import { DEFAULT_INVENTORY_QUERY } from '@/lib/inventory-params';
import { statusCounts, visibleMaterialEntries } from '@/lib/inventory-filter';

function spool(id: string, over: Partial<SpoolView> = {}): SpoolView {
  return {
    id,
    filamentLeftGrams: 500,
    isEmpty: false,
    location: null,
    ...over,
  } as SpoolView;
}

function inv(
  id: string,
  filamentType: string,
  spools: SpoolView[]
): MaterialInventory {
  return {
    material: {
      id,
      name: `Name ${id}`,
      manufacturer: 'Prusament',
      filamentType,
    } as Material,
    spools,
    totalLeftGrams: 0,
  };
}

const inventory = [
  inv('a', 'PLA', [
    spool('a1', { location: 'Dry box' }),
    spool('a2', { isEmpty: true, filamentLeftGrams: 0 }),
  ]),
  inv('b', 'PETG', [spool('b1', { filamentLeftGrams: 120 })]),
  inv('c', 'ASA', [spool('c1')]),
];

const visible = (q: Partial<typeof DEFAULT_INVENTORY_QUERY>) =>
  visibleMaterialEntries(
    inventory,
    { ...DEFAULT_INVENTORY_QUERY, ...q },
    {}
  ).map((e) => [e.inventory.material.id, [...e.visibleIds]]);

describe('visibleMaterialEntries', () => {
  it('shows in-stock spools by default', () => {
    expect(visible({})).toEqual([
      ['a', ['a1']],
      ['b', ['b1']],
      ['c', ['c1']],
    ]);
  });

  it('switches to empty or all spools', () => {
    expect(visible({ status: 'empty' })).toEqual([['a', ['a2']]]);
    expect(visible({ status: 'all' })[0]).toEqual(['a', ['a1', 'a2']]);
  });

  it('matches any of several types', () => {
    expect(
      visible({ filamentTypes: ['PETG', 'ASA'] }).map((e) => e[0])
    ).toEqual(['b', 'c']);
  });

  it('applies the minimum and searches spool locations', () => {
    expect(visible({ minLeftGrams: 200 }).map((e) => e[0])).toEqual(['a', 'c']);
    expect(visible({ q: 'dry box' })).toEqual([['a', ['a1']]]);
  });
});

describe('statusCounts', () => {
  it('counts spools per stock status', () => {
    expect(statusCounts(inventory)).toEqual({ inStock: 3, empty: 1, all: 4 });
  });
});
