import { describe, expect, it } from 'vitest';
import type { Material, Spool, SpoolType } from '@/lib/db/schema';
import {
  computeFilamentLeft,
  formatMoney,
  formatWeight,
  groupInventory,
  lendUsageGrams,
  needsDrying,
  parsePriceCents,
  toSpoolView,
} from '@/lib/filament';

const at = (iso: string) => new Date(iso);

function spoolType(emptyWeightGrams: number): SpoolType {
  return {
    id: 'st1',
    manufacturer: 'Prusament',
    name: 'Standard',
    emptyWeightGrams,
    status: 'approved',
    createdAt: at('2026-01-01'),
  } as SpoolType;
}

function spool(over: Partial<Spool> = {}): Spool {
  return {
    id: 's1',
    userId: 'u1',
    materialId: 'm1',
    spoolTypeId: 'st1',
    fullFilamentWeightGrams: 1000,
    measuredTotalWeightGrams: 1200,
    tagUid: null,
    pricePaidCents: null,
    purchasedAt: null,
    location: null,
    lastDriedAt: null,
    createdAt: at('2026-01-01'),
    updatedAt: at('2026-01-01'),
    ...over,
  };
}

function material(id: string, createdAt: string): Material {
  return {
    id,
    manufacturer: 'Prusament',
    name: id,
    filamentType: 'PLA',
    createdAt: at(createdAt),
  } as Material;
}

describe('computeFilamentLeft', () => {
  it('subtracts the empty spool weight', () => {
    expect(computeFilamentLeft(1200, 200)).toBe(1000);
  });
  it('never goes negative', () => {
    expect(computeFilamentLeft(150, 200)).toBe(0);
  });
});

describe('toSpoolView', () => {
  it('computes remaining grams and percent', () => {
    const v = toSpoolView(
      spool({ measuredTotalWeightGrams: 700 }),
      spoolType(200)
    );
    expect(v.filamentLeftGrams).toBe(500);
    expect(v.percentLeft).toBe(50);
    expect(v.isEmpty).toBe(false);
    expect(v.isLow).toBe(false);
  });

  it('is empty at 5 g or less, and empty is never also low', () => {
    const v = toSpoolView(
      spool({ measuredTotalWeightGrams: 205 }),
      spoolType(200)
    );
    expect(v.isEmpty).toBe(true);
    expect(v.isLow).toBe(false);
  });

  it('is low at 15 % or less', () => {
    const low = toSpoolView(
      spool({ measuredTotalWeightGrams: 350 }),
      spoolType(200)
    );
    expect(low.isLow).toBe(true);
    const ok = toSpoolView(
      spool({ measuredTotalWeightGrams: 360 }),
      spoolType(200)
    );
    expect(ok.isLow).toBe(false);
  });

  it('clamps percent to 0–100 and survives a 0 g nominal weight', () => {
    expect(
      toSpoolView(spool({ measuredTotalWeightGrams: 5000 }), spoolType(200))
        .percentLeft
    ).toBe(100);
    expect(
      toSpoolView(spool({ fullFilamentWeightGrams: 0 }), spoolType(200))
        .percentLeft
    ).toBe(0);
  });
});

describe('groupInventory', () => {
  it('groups by material, newest material first, spools oldest first', () => {
    const st = spoolType(200);
    const older = material('older', '2026-01-01');
    const newer = material('newer', '2026-02-01');
    const rows = [
      {
        spool: spool({
          id: 'a2',
          materialId: 'older',
          createdAt: at('2026-03-02'),
        }),
        material: older,
        spoolType: st,
      },
      {
        spool: spool({ id: 'b1', materialId: 'newer' }),
        material: newer,
        spoolType: st,
      },
      {
        spool: spool({
          id: 'a1',
          materialId: 'older',
          createdAt: at('2026-03-01'),
        }),
        material: older,
        spoolType: st,
      },
    ];
    const result = groupInventory(rows, new Map([['a1', 'Felix']]));
    expect(result.map((g) => g.material.id)).toEqual(['newer', 'older']);
    expect(result[1].spools.map((s) => s.id)).toEqual(['a1', 'a2']);
    expect(result[1].totalLeftGrams).toBe(2000);
    expect(result[1].spools[0].lentToName).toBe('Felix');
    expect(result[1].spools[1].lentToName).toBeNull();
  });
});

describe('formatWeight', () => {
  it('uses g below 1 kg and kg above', () => {
    expect(formatWeight(999.4)).toBe('999 g');
    expect(formatWeight(1000)).toBe('1.00 kg');
    expect(formatWeight(1234)).toBe('1.23 kg');
  });
});

describe('prices', () => {
  it('parses typed prices into cents', () => {
    expect(parsePriceCents('19.99')).toBe(1999);
    expect(parsePriceCents('19,99')).toBe(1999);
    expect(parsePriceCents(' € 20 ')).toBe(2000);
    expect(parsePriceCents('')).toBeNull();
    expect(parsePriceCents('1.999')).toBeUndefined();
    expect(parsePriceCents('abc')).toBeUndefined();
  });

  it('derives price per gram and the value left on the spool', () => {
    const v = toSpoolView(
      spool({ pricePaidCents: 2000, measuredTotalWeightGrams: 700 }),
      spoolType(200)
    );
    expect(v.pricePerGramCents).toBe(2);
    expect(v.valueLeftCents).toBe(1000);
    expect(formatMoney(1000)).toBe('€10.00');
  });
});

describe('needsDrying', () => {
  const now = at('2026-06-01');
  it('only flags hygroscopic types past their interval', () => {
    expect(needsDrying('PLA', null, at('2020-01-01'), now)).toBe(false);
    expect(needsDrying('Nylon', null, at('2026-05-25'), now)).toBe(false);
    expect(needsDrying('Nylon', null, at('2026-05-01'), now)).toBe(true);
    expect(needsDrying('Nylon', at('2026-05-30'), at('2026-01-01'), now)).toBe(
      false
    );
  });

  it('is set on the view, but never for empty spools', () => {
    const old = { createdAt: at('2025-01-01') };
    expect(toSpoolView(spool(old), spoolType(200), 'PETG').needsDrying).toBe(
      true
    );
    expect(
      toSpoolView(
        spool({ ...old, measuredTotalWeightGrams: 200 }),
        spoolType(200),
        'PETG'
      ).needsDrying
    ).toBe(false);
  });
});

describe('lendUsageGrams', () => {
  it('uses the return weight, or the current one while active', () => {
    expect(
      lendUsageGrams({
        startWeightGrams: 1000,
        endWeightGrams: 760,
        currentWeightGrams: 0,
      })
    ).toBe(240);
    expect(
      lendUsageGrams({
        startWeightGrams: 1000,
        endWeightGrams: null,
        currentWeightGrams: 900,
      })
    ).toBe(100);
    expect(
      lendUsageGrams({
        startWeightGrams: null,
        endWeightGrams: null,
        currentWeightGrams: 900,
      })
    ).toBeNull();
  });
});
