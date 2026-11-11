import { describe, expect, it } from 'vitest';
import { groupByManufacturer } from '@/lib/catalog-groups';

describe('groupByManufacturer', () => {
  const rows = [
    { manufacturer: 'Bambu Lab', name: 'Basic Cyan' },
    { manufacturer: 'Bambu Lab', name: 'Jade White' },
    { manufacturer: 'Prusament', name: 'Galaxy Black' },
    { manufacturer: 'Bambu Lab', name: 'Late page-2 row' },
  ];

  it('keeps first-seen manufacturer order and row order', () => {
    const groups = groupByManufacturer(rows, (r) => r.manufacturer);
    expect(groups.map((g) => [g.manufacturer, g.entries.length])).toEqual([
      ['Bambu Lab', 3],
      ['Prusament', 1],
    ]);
    expect(groups[0].entries.map((r) => r.name)).toEqual([
      'Basic Cyan',
      'Jade White',
      'Late page-2 row',
    ]);
  });

  it('uses known totals and falls back to the rows shown', () => {
    const groups = groupByManufacturer(rows, (r) => r.manufacturer, {
      'Bambu Lab': 214,
    });
    expect(groups.map((g) => g.total)).toEqual([214, 1]);
  });

  it('returns nothing for no rows', () => {
    expect(groupByManufacturer([], () => 'x')).toEqual([]);
  });
});
