import { describe, expect, it } from 'vitest';
import {
  anyConstraintActive,
  constraintActive,
  materialMatchesConstraints,
  parseBounds,
  parseConstraints,
  type PropertyConstraint,
  serializeConstraints,
  valueMatchesRange,
} from '@/lib/property-filter';

describe('parseBounds', () => {
  it('reads scalars, en-dash ranges and lists', () => {
    expect(parseBounds('1.27')).toEqual([1.27, 1.27]);
    expect(parseBounds('220–250')).toEqual([220, 250]);
    expect(parseBounds('1.75, 2.85')).toEqual([1.75, 2.85]);
    expect(parseBounds('n/a')).toBeNull();
  });
});

describe('valueMatchesRange', () => {
  it('matches by overlap with either bound optional', () => {
    expect(valueMatchesRange('220–250', 240, null)).toBe(true);
    expect(valueMatchesRange('220–250', null, 210)).toBe(false);
    expect(valueMatchesRange('220–250', 200, 230)).toBe(true);
    expect(valueMatchesRange('n/a', null, null)).toBe(false);
  });
});

const P = '6b1f0c2e-0000-4000-8000-000000000001';
const Q = '6b1f0c2e-0000-4000-8000-000000000002';
const c = (
  propertyId: string,
  min: number | null,
  max: number | null,
  id = 'c'
): PropertyConstraint => ({ id, propertyId, min, max });

describe('constraintActive / anyConstraintActive', () => {
  it('needs a property and at least one bound', () => {
    expect(constraintActive(c(P, 1, null))).toBe(true);
    expect(constraintActive(c(P, null, 2))).toBe(true);
    expect(constraintActive(c(P, null, null))).toBe(false);
    expect(constraintActive(c('', 1, 2))).toBe(false);
    expect(anyConstraintActive([c('', 1, 2), c(P, 0, null)])).toBe(true);
    expect(anyConstraintActive([])).toBe(false);
  });
});

describe('materialMatchesConstraints', () => {
  const values = [
    { propertyId: P, value: '1.24' },
    { propertyId: Q, value: '220–250' },
  ];

  it('ANDs every active constraint and skips inactive ones', () => {
    expect(
      materialMatchesConstraints(values, [
        c(P, 1, 1.3),
        c(Q, 240, null),
        c(P, null, null),
      ])
    ).toBe(true);
    expect(
      materialMatchesConstraints(values, [c(P, 1, 1.3), c(Q, 260, null)])
    ).toBe(false);
  });

  it('excludes materials without a value for a constrained property', () => {
    expect(materialMatchesConstraints([values[0]], [c(Q, null, 300)])).toBe(
      false
    );
  });

  it('matches everything without constraints', () => {
    expect(materialMatchesConstraints([], [])).toBe(true);
  });
});

describe('serializeConstraints / parseConstraints', () => {
  it('round-trips active constraints with open bounds', () => {
    const s = serializeConstraints([
      c(P, 1.2, null),
      c(Q, null, 250),
      c('', 1, 2),
    ]);
    expect(s).toBe(`${P}:1.2:,${Q}::250`);
    expect(parseConstraints(s)).toEqual([
      { id: 'c-url-0', propertyId: P, min: 1.2, max: null },
      { id: 'c-url-1', propertyId: Q, min: null, max: 250 },
    ]);
  });

  it('drops empty, non-numeric and boundless segments', () => {
    expect(parseConstraints('')).toEqual([]);
    expect(parseConstraints(`${P}:abc:`)).toEqual([]);
    expect(parseConstraints(`${P}`)).toEqual([]);
    expect(parseConstraints(`${P}:x:5`)).toEqual([
      { id: 'c-url-0', propertyId: P, min: null, max: 5 },
    ]);
  });
});
