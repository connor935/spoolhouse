import { describe, expect, it } from 'vitest';
import {
  ALL_MANUFACTURERS,
  ALL_TYPES,
  manufacturerItems,
  TYPE_ITEMS,
} from '@/lib/catalog-filter-items';

describe('manufacturerItems', () => {
  it('lists each manufacturer once, sorted, after the "all" item', () => {
    expect(
      manufacturerItems([
        { manufacturer: 'Prusament' },
        { manufacturer: 'Elegoo' },
        { manufacturer: 'Prusament' },
      ])
    ).toEqual([
      { value: ALL_MANUFACTURERS, label: 'All manufacturers' },
      { value: 'Elegoo', label: 'Elegoo' },
      { value: 'Prusament', label: 'Prusament' },
    ]);
  });

  it('is only the "all" item without rows', () => {
    expect(manufacturerItems([])).toHaveLength(1);
  });
});

describe('TYPE_ITEMS', () => {
  it('starts with the "all" sentinel', () => {
    expect(TYPE_ITEMS[0]).toEqual({ value: ALL_TYPES, label: 'All types' });
  });
});
