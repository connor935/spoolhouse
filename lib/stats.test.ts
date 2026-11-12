import { describe, expect, it } from 'vitest';
import type { UsageEvent } from '@/lib/consumption';
import type { Material } from '@/lib/db/schema';
import type { MaterialInventory } from '@/lib/filament';
import { stockByType, usageRows } from '@/lib/stats';

const d = (iso: string) => new Date(iso);
const NOW = d('2026-11-10T12:00:00Z');
const TRACKED = d('2026-06-01T00:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function material(id: string, filamentType: string): Material {
  return {
    id,
    manufacturer: 'Prusament',
    name: `Material ${id}`,
    filamentType,
    color: `#00000${id.length}`,
    status: 'approved',
    createdAt: d('2026-01-01'),
  } as Material;
}

function inv(id: string, type: string, leftGrams: number): MaterialInventory {
  return {
    material: material(id, type),
    spools: [],
    totalLeftGrams: leftGrams,
  } as unknown as MaterialInventory;
}

const ev = (spoolId: string, daysAgo: number, grams: number): UsageEvent => ({
  spoolId,
  at: new Date(NOW.getTime() - daysAgo * DAY),
  grams,
});

// One spool per material, named after it.
const materialOf = (e: UsageEvent) => e.spoolId;

describe('usageRows', () => {
  const inventory = [
    inv('a', 'PLA', 500),
    inv('b', 'PETG', 1000),
    inv('idle', 'PLA', 800),
    inv('gone', 'ASA', 0),
  ];
  const events = [ev('a', 5, 300), ev('b', 40, 100), ev('gone', 200, 50)];

  const byMaterial = () =>
    usageRows({
      events,
      eventKey: materialOf,
      inventory,
      keyOf: (m) => m.material.id,
      labelOf: (m) => m.material.name,
      colorOf: (m) => m.material.color,
      typeOf: (m) => m.material.filamentType,
      now: NOW,
      trackedSince: TRACKED,
    });

  it('keeps stocked materials without recent use, as rows with no forecast', () => {
    const idle = byMaterial().find((r) => r.key === 'idle');
    expect(idle).toMatchObject({
      usedLast90Grams: 0,
      leftGrams: 800,
      forecastDays: null,
    });
  });

  it('drops materials that are neither in stock nor used in 90 days', () => {
    expect(byMaterial().map((r) => r.key)).not.toContain('gone');
  });

  it('carries label, colour and filament type of the material', () => {
    expect(byMaterial().find((r) => r.key === 'b')).toMatchObject({
      label: 'Material b',
      color: '#000001',
      filamentType: 'PETG',
      usedLast90Grams: 100,
      leftGrams: 1000,
    });
  });

  it('sorts the shortest runway first, idle rows last', () => {
    const keys = byMaterial().map((r) => r.key);
    expect(keys.at(-1)).toBe('idle');
    expect(keys.indexOf('a')).toBeLessThan(keys.indexOf('b'));
  });

  it('has no forecasts before anything was tracked', () => {
    const rows = usageRows({
      events: [],
      eventKey: materialOf,
      inventory,
      keyOf: (m) => m.material.id,
      labelOf: (m) => m.material.name,
      now: NOW,
      trackedSince: null,
    });
    expect(rows.every((r) => r.forecastDays === null)).toBe(true);
  });

  it('sums materials of one type into one row', () => {
    const rows = usageRows({
      events,
      eventKey: (e) =>
        inventory.find((m) => m.material.id === e.spoolId)!.material
          .filamentType,
      inventory,
      keyOf: (m) => m.material.filamentType,
      labelOf: (m) => m.material.filamentType,
      now: NOW,
      trackedSince: TRACKED,
    });
    expect(rows.find((r) => r.key === 'PLA')).toMatchObject({
      usedLast90Grams: 300,
      leftGrams: 1300,
    });
    expect(rows.map((r) => r.key)).not.toContain('ASA');
  });
});

describe('stockByType', () => {
  it('sums the filament left per type, largest first, without empty types', () => {
    expect(
      stockByType([
        inv('a', 'PLA', 500),
        inv('b', 'PETG', 1200),
        inv('c', 'PLA', 900),
        inv('d', 'ASA', 0),
      ])
    ).toEqual([
      { type: 'PLA', grams: 1400 },
      { type: 'PETG', grams: 1200 },
    ]);
  });

  it('is empty without stock', () => {
    expect(stockByType([])).toEqual([]);
  });
});
