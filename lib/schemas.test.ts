import { describe, expect, it } from 'vitest';
import {
  spoolInputSchema,
  weighRegistrationSchema,
  materialCatalogQuerySchema,
  adminMaterialQuerySchema,
} from '@/lib/schemas';

describe('weighRegistrationSchema', () => {
  const base = {
    manufacturer: 'Bambu Lab',
    name: 'PLA Matte',
    emptyWeightGrams: 250,
  };

  it('accepts a minimal registration and defaults the type to Other', () => {
    const r = weighRegistrationSchema.parse(base);
    expect(r.filamentType).toBe('Other');
    expect(r.color).toBeNull();
    expect(r.fullFilamentWeightGrams).toBeUndefined();
  });
  it('refuses a missing or 0 g empty-spool weight', () => {
    expect(
      weighRegistrationSchema.safeParse({
        ...base,
        emptyWeightGrams: undefined,
      }).success
    ).toBe(false);
    expect(
      weighRegistrationSchema.safeParse({ ...base, emptyWeightGrams: 0 })
        .success
    ).toBe(false);
  });
  it('names the registration fields when they are missing', () => {
    const r = weighRegistrationSchema.safeParse({});
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/To register/);
  });
  it('refuses an unknown filament type', () => {
    expect(
      weighRegistrationSchema.safeParse({ ...base, filamentType: 'Wood' })
        .success
    ).toBe(false);
    expect(
      weighRegistrationSchema.parse({ ...base, filamentType: 'PETG' })
        .filamentType
    ).toBe('PETG');
  });
});

describe('spoolInputSchema', () => {
  const base = {
    materialId: 'm',
    spoolTypeId: 'st',
    fullFilamentWeightGrams: 1000,
    measuredTotalWeightGrams: 1200,
  };

  it('rounds weights', () => {
    expect(
      spoolInputSchema.parse({ ...base, measuredTotalWeightGrams: 1200.6 })
        .measuredTotalWeightGrams
    ).toBe(1201);
  });
  it('refuses NaN, negative and 0 g nominal weights', () => {
    expect(
      spoolInputSchema.safeParse({ ...base, measuredTotalWeightGrams: NaN })
        .success
    ).toBe(false);
    expect(
      spoolInputSchema.safeParse({ ...base, measuredTotalWeightGrams: -1 })
        .success
    ).toBe(false);
    expect(
      spoolInputSchema.safeParse({ ...base, fullFilamentWeightGrams: 0 })
        .success
    ).toBe(false);
  });
});

describe('spool detail fields', () => {
  const base = {
    materialId: 'm',
    spoolTypeId: 'st',
    fullFilamentWeightGrams: 1000,
    measuredTotalWeightGrams: 1200,
  };

  it('accepts and normalises the optional details', () => {
    const r = spoolInputSchema.parse({
      ...base,
      pricePaidCents: 1999,
      purchasedAt: '2026-10-01',
      location: '  Dry box 2 ',
      lastDriedAt: '2026-10-05T12:00:00.000Z',
    });
    expect(r.location).toBe('Dry box 2');
    expect(r.lastDriedAt).toEqual(new Date('2026-10-05T12:00:00.000Z'));
  });
  it('treats a blank location as none', () => {
    expect(
      spoolInputSchema.parse({ ...base, location: '   ' }).location
    ).toBeNull();
  });
  it('refuses bad prices and dates', () => {
    expect(
      spoolInputSchema.safeParse({ ...base, pricePaidCents: -1 }).success
    ).toBe(false);
    expect(
      spoolInputSchema.safeParse({ ...base, pricePaidCents: 19.5 }).success
    ).toBe(false);
    expect(
      spoolInputSchema.safeParse({ ...base, purchasedAt: '01.10.2026' }).success
    ).toBe(false);
    expect(
      spoolInputSchema.safeParse({ ...base, lastDriedAt: 'yesterday' }).success
    ).toBe(false);
  });
});

describe('materialCatalogQuerySchema', () => {
  it('accepts a full catalog query and defaults the page', () => {
    const parsed = materialCatalogQuerySchema.parse({
      q: ' pla ',
      filamentTypes: ['PLA', 'PETG'],
      constraints: [{ id: 'c', propertyId: 'p', min: 1.2, max: null }],
    });
    expect(parsed).toMatchObject({ q: 'pla', limit: 150, offset: 0 });
  });

  it('caps the page size and refuses negative offsets or junk constraints', () => {
    expect(() => materialCatalogQuerySchema.parse({ limit: 500 })).toThrow();
    expect(() => materialCatalogQuerySchema.parse({ offset: -1 })).toThrow();
    expect(() =>
      materialCatalogQuerySchema.parse({
        constraints: [{ id: 'c', propertyId: 'p', min: 'x', max: null }],
      })
    ).toThrow();
  });
});

describe('adminMaterialQuerySchema', () => {
  it('accepts a review status and treats an empty one as all', () => {
    expect(adminMaterialQuerySchema.parse({ status: 'pending' }).status).toBe(
      'pending'
    );
    expect(adminMaterialQuerySchema.parse({ status: null }).status).toBeNull();
  });

  it('refuses an unknown status', () => {
    expect(() => adminMaterialQuerySchema.parse({ status: 'spam' })).toThrow();
  });
});
