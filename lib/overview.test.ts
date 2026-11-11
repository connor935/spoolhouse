import { describe, expect, it } from 'vitest';
import type { MaterialInventory, SpoolView } from '@/lib/filament';
import type { Material } from '@/lib/db/schema';
import {
  dryingList,
  runningLow,
  stockSummary,
  stockValue,
  usageDelta,
} from '@/lib/overview';

const d = (iso: string) => new Date(iso);
const NOW = d('2026-11-10T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function spool(over: Partial<SpoolView> = {}): SpoolView {
  return {
    id: 's',
    materialId: 'm',
    spoolTypeId: 't',
    spoolTypeLabel: 'Prusament — Cardboard (193 g)',
    emptyWeightGrams: 193,
    fullFilamentWeightGrams: 1000,
    measuredTotalWeightGrams: 693,
    filamentLeftGrams: 500,
    percentLeft: 50,
    isEmpty: false,
    isLow: false,
    lentToName: null,
    pricePaidCents: null,
    pricePerGramCents: null,
    valueLeftCents: null,
    purchasedAt: null,
    location: null,
    lastDriedAt: null,
    needsDrying: false,
    createdAt: d('2026-01-01'),
    ...over,
  };
}

function material(id: string, filamentType = 'PLA'): Material {
  return {
    id,
    manufacturer: 'Prusament',
    name: `Material ${id}`,
    filamentType,
    color: '#000000',
    status: 'approved',
    createdAt: d('2026-01-01'),
  } as Material;
}

function inv(m: Material, spools: SpoolView[]): MaterialInventory {
  return {
    material: m,
    spools,
    totalLeftGrams: spools.reduce((s, x) => s + x.filamentLeftGrams, 0),
  };
}

describe('usageDelta', () => {
  const event = (daysAgo: number, grams: number) => ({
    spoolId: 'a',
    at: new Date(NOW.getTime() - daysAgo * DAY),
    grams,
  });

  it('compares the last 30 days with the 30 days before', () => {
    const delta = usageDelta(
      [event(70, 999), event(45, 600), event(31, 400), event(10, 800)],
      NOW
    );
    expect(delta).toEqual({
      last30Grams: 800,
      prev30Grams: 1000,
      deltaPct: -20,
    });
  });

  it('has no percentage without a previous period', () => {
    expect(usageDelta([event(3, 120)], NOW)).toEqual({
      last30Grams: 120,
      prev30Grams: 0,
      deltaPct: null,
    });
  });
});

describe('stockSummary', () => {
  it('counts in-stock, low and empty spools and the materials/types in stock', () => {
    const summary = stockSummary([
      inv(material('a', 'PLA'), [
        spool({ id: '1', filamentLeftGrams: 700 }),
        spool({ id: '2', filamentLeftGrams: 100, isLow: true }),
      ]),
      inv(material('b', 'PETG'), [
        spool({ id: '3', filamentLeftGrams: 0, isEmpty: true }),
      ]),
      inv(material('c', 'PETG'), [spool({ id: '4', filamentLeftGrams: 300 })]),
    ]);
    expect(summary).toEqual({
      inStock: 3,
      total: 4,
      low: 1,
      empty: 1,
      leftGrams: 1100,
      materials: 2,
      types: 2,
    });
  });
});

describe('stockValue', () => {
  it('sums the value left of priced in-stock spools', () => {
    const value = stockValue([
      inv(material('a'), [
        spool({ id: '1', valueLeftCents: 1000.4 }),
        spool({ id: '2', valueLeftCents: null }),
        spool({ id: '3', isEmpty: true, valueLeftCents: 0 }),
      ]),
      inv(material('b'), [spool({ id: '4', valueLeftCents: 1250.2 })]),
    ]);
    expect(value).toEqual({ cents: 2251, priced: 2, stocked: 3 });
  });
});

describe('runningLow', () => {
  it('lists materials with a low spool or a short forecast, soonest first', () => {
    const rows = runningLow(
      [
        inv(material('ok'), [spool({ id: '1', filamentLeftGrams: 900 })]),
        inv(material('low'), [
          spool({ id: '2', filamentLeftGrams: 142, isLow: true }),
        ]),
        inv(material('fast'), [
          spool({ id: '3', filamentLeftGrams: 212 }),
          spool({ id: '4', filamentLeftGrams: 198 }),
        ]),
      ],
      { ok: 1, low: 7, fast: 6 }
    );
    expect(
      rows.map((r) => [r.material.id, Math.round(r.forecastDays!), r.isLow])
    ).toEqual([
      ['low', 20, true],
      ['fast', 68, false],
    ]);
    expect(rows[1].spools.map((s) => s.spool.id)).toEqual(['3', '4']);
    expect(rows[1].leftGrams).toBe(410);
  });

  it('keeps spool numbers and leaves out empty spools', () => {
    const [row] = runningLow(
      [
        inv(material('a'), [
          spool({ id: 'old', filamentLeftGrams: 0, isEmpty: true }),
          spool({ id: 'new', filamentLeftGrams: 80, isLow: true }),
        ]),
      ],
      {}
    );
    expect(row.spools).toEqual([
      { spool: expect.objectContaining({ id: 'new' }), number: 2 },
    ]);
    expect(row.forecastDays).toBeNull();
  });

  it('puts low materials without a forecast after forecast ones', () => {
    const rows = runningLow(
      [
        inv(material('noRate'), [
          spool({ id: '1', filamentLeftGrams: 50, isLow: true }),
        ]),
        inv(material('rate'), [spool({ id: '2', filamentLeftGrams: 300 })]),
      ],
      { rate: 10 }
    );
    expect(rows.map((r) => r.material.id)).toEqual(['rate', 'noRate']);
  });

  it('caps the list', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      inv(material(`m${i}`), [
        spool({ id: `s${i}`, filamentLeftGrams: 50 + i, isLow: true }),
      ])
    );
    expect(runningLow(many, {}, 5)).toHaveLength(5);
  });
});

describe('dryingList', () => {
  it('lists spools that need drying, longest overdue first', () => {
    const rows = dryingList(
      [
        inv(material('a', 'PETG'), [
          spool({
            id: 'dried',
            needsDrying: true,
            lastDriedAt: new Date(NOW.getTime() - 94 * DAY),
          }),
          spool({ id: 'fine' }),
        ]),
        inv(material('b', 'ASA'), [
          spool({
            id: 'never',
            needsDrying: true,
            createdAt: new Date(NOW.getTime() - 120 * DAY),
          }),
        ]),
      ],
      NOW
    );
    expect(
      rows.map((r) => [r.spool.id, r.number, r.daysSinceDried, r.neverDried])
    ).toEqual([
      ['never', 1, 120, true],
      ['dried', 1, 94, false],
    ]);
  });
});
