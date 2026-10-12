import { describe, expect, it } from 'vitest';
import { spoolInputSchema, weighRegistrationSchema } from '@/lib/schemas';

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
