import { describe, expect, it } from 'vitest';
import {
  countActiveFilters,
  EMPTY_FILTER_VALUE,
  filterChips,
  parseFilterNumber,
  removeFilterChip,
  setPropertyBound,
  type FilterValue,
} from './filter-value';

const density = { id: 'p-density', name: 'Density', unit: 'g/cm³' };
const bedTemp = { id: 'p-bed', name: 'Bed temp', unit: '°C' };
const hardness = { id: 'p-hardness', name: 'Hardness', unit: null };

const value: FilterValue = {
  filamentTypes: ['PLA', 'PETG'],
  minLeftGrams: 300,
  hideLent: true,
  propertyConstraints: [
    { id: 'p-density', propertyId: 'p-density', min: 1.2, max: 1.3 },
    { id: 'p-bed', propertyId: 'p-bed', min: null, max: 60 },
    // Inactive: no bounds, so neither counted nor chipped.
    { id: 'p-hardness', propertyId: 'p-hardness', min: null, max: null },
  ],
};

describe('countActiveFilters', () => {
  it('counts fields, not picked types', () => {
    expect(countActiveFilters(EMPTY_FILTER_VALUE)).toBe(0);
    expect(countActiveFilters(value)).toBe(5);
    expect(
      countActiveFilters({
        ...EMPTY_FILTER_VALUE,
        filamentTypes: ['PLA', 'ABS'],
      })
    ).toBe(1);
  });
});

describe('parseFilterNumber', () => {
  it.each([
    ['', null],
    ['   ', null],
    ['300', 300],
    [' 1.25 ', 1.25],
    ['1,24', 1.24],
    ['-5', -5],
    ['abc', null],
    ['1,75, 2,85', null],
  ])('%j → %j', (raw, expected) => {
    expect(parseFilterNumber(raw)).toBe(expected);
  });
});

describe('setPropertyBound', () => {
  it('adds a constraint for a new property', () => {
    expect(setPropertyBound([], 'p-density', 'min', 1.2)).toEqual([
      { id: 'p-density', propertyId: 'p-density', min: 1.2, max: null },
    ]);
  });

  it('updates in place and keeps the other bound', () => {
    const next = setPropertyBound(
      value.propertyConstraints,
      'p-density',
      'max',
      1.4
    );
    expect(next[0]).toEqual({
      id: 'p-density',
      propertyId: 'p-density',
      min: 1.2,
      max: 1.4,
    });
    expect(next).toHaveLength(3);
  });

  it('drops the constraint once both bounds are cleared', () => {
    const once = setPropertyBound(
      value.propertyConstraints,
      'p-bed',
      'max',
      null
    );
    expect(once.map((c) => c.propertyId)).toEqual(['p-density', 'p-hardness']);
  });
});

describe('filterChips', () => {
  it('names every active filter', () => {
    expect(filterChips(value, [density, bedTemp, hardness])).toEqual([
      { id: 'type:PLA', label: 'PLA' },
      { id: 'type:PETG', label: 'PETG' },
      { id: 'minLeft', label: '≥ 300 g left' },
      { id: 'hideLent', label: 'Lent hidden' },
      { id: 'prop:p-density', label: 'Density 1.2–1.3 g/cm³' },
      { id: 'prop:p-bed', label: 'Bed temp ≤ 60 °C' },
    ]);
  });

  it('labels a minimum-only range and a unitless property', () => {
    const chips = filterChips(
      {
        ...EMPTY_FILTER_VALUE,
        propertyConstraints: [
          { id: 'h', propertyId: 'p-hardness', min: 80, max: null },
        ],
      },
      [hardness]
    );
    expect(chips).toEqual([{ id: 'prop:p-hardness', label: 'Hardness ≥ 80' }]);
  });

  it('keeps a chip for a deleted property definition', () => {
    const chips = filterChips(value, [density]);
    expect(chips.at(-1)).toEqual({
      id: 'prop:p-bed',
      label: 'Removed property ≤ 60',
    });
  });
});

describe('removeFilterChip', () => {
  it('removes exactly the filter behind each chip', () => {
    expect(removeFilterChip(value, 'type:PLA').filamentTypes).toEqual(['PETG']);
    expect(removeFilterChip(value, 'minLeft').minLeftGrams).toBeNull();
    expect(removeFilterChip(value, 'hideLent').hideLent).toBe(false);
    expect(
      removeFilterChip(value, 'prop:p-density').propertyConstraints.map(
        (c) => c.propertyId
      )
    ).toEqual(['p-bed', 'p-hardness']);
  });

  it('ignores unknown ids', () => {
    expect(removeFilterChip(value, 'nope')).toBe(value);
  });

  it('round-trips: removing every chip leaves no active filter', () => {
    const cleared = filterChips(value, [density, bedTemp]).reduce(
      (v, chip) => removeFilterChip(v, chip.id),
      value
    );
    expect(countActiveFilters(cleared)).toBe(0);
  });
});
