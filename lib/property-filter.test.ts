import { describe, expect, it } from 'vitest';
import { parseBounds, valueMatchesRange } from '@/lib/property-filter';

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
