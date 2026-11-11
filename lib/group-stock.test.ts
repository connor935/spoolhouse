import { describe, expect, it } from 'vitest';
import {
  filterStock,
  groupStockByMaterial,
  shareCountsByOwner,
} from '@/lib/group-stock';
import type { SharedSpool } from '@/lib/sharing';

const ME = 'user-me';

function spool(
  id: string,
  materialName: string,
  ownerId: string,
  ownerName: string,
  extra: Partial<SharedSpool> = {}
): SharedSpool {
  return {
    id,
    ownerId,
    ownerName,
    filamentLeftGrams: 500,
    material: {
      id: `mat-${materialName}`,
      name: materialName,
      manufacturer: 'Acme',
      filamentType: materialName === 'Orange' ? 'PETG' : 'PLA',
    },
    lentTo: null,
    pendingRequest: null,
    ...extra,
  } as SharedSpool;
}

const stock = [
  spool('s1', 'Orange', 'user-zoe', 'Zoe'),
  spool('s2', 'Black', 'user-anna', 'Anna', { filamentLeftGrams: 300 }),
  spool('s3', 'Black', ME, 'Me', { filamentLeftGrams: 700 }),
  spool('s4', 'Black', 'user-anna', 'Anna', {
    lentTo: { lendId: 'l1', borrowerId: ME, borrowerName: 'Me', since: null },
  }),
];

describe('groupStockByMaterial', () => {
  it('groups by material, sorted by name, totals what is left', () => {
    const groups = groupStockByMaterial(stock, ME);
    expect(groups.map((g) => g.material.name)).toEqual(['Black', 'Orange']);
    expect(groups[0].totalLeftGrams).toBe(1500);
  });

  it('lists your own spools first, then by owner name', () => {
    const [black] = groupStockByMaterial(stock, ME);
    expect(black.spools.map((s) => s.id)).toEqual(['s3', 's2', 's4']);
  });
});

describe('filterStock', () => {
  const none = { q: '', filamentType: null, ownerId: null, hideLent: false };

  it('searches manufacturer, name and type token-wise', () => {
    expect(
      filterStock(stock, { ...none, q: 'acme petg' }).map((s) => s.id)
    ).toEqual(['s1']);
    expect(filterStock(stock, { ...none, q: 'black' })).toHaveLength(3);
    expect(filterStock(stock, { ...none, q: 'nylon' })).toHaveLength(0);
  });

  it('passes everything without filters', () => {
    expect(filterStock(stock, none)).toHaveLength(4);
  });

  it('filters by filament type and member', () => {
    expect(
      filterStock(stock, { ...none, filamentType: 'PETG' }).map((s) => s.id)
    ).toEqual(['s1']);
    expect(
      filterStock(stock, { ...none, ownerId: 'user-anna' }).map((s) => s.id)
    ).toEqual(['s2', 's4']);
  });

  it('hide lent drops every spool that is out on a lend', () => {
    expect(
      filterStock(stock, { ...none, hideLent: true }).map((s) => s.id)
    ).toEqual(['s1', 's2', 's3']);
  });
});

describe('shareCountsByOwner', () => {
  it('counts shared spools per owner', () => {
    expect(shareCountsByOwner(stock)).toEqual(
      new Map([
        ['user-zoe', 1],
        ['user-anna', 2],
        [ME, 1],
      ])
    );
  });
});
