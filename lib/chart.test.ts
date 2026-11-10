import { describe, expect, it } from 'vitest';
import { valueTicks, wholePercentages } from '@/lib/chart';

describe('valueTicks', () => {
  it('picks three round ticks with headroom above the peak', () => {
    // The Statistics board: peak 1.62 kg → 0.5 / 1.0 / 1.5 kg.
    const { ticks, top } = valueTicks(1620);
    expect(ticks).toEqual([500, 1000, 1500]);
    expect(top).toBeGreaterThan(1620);
  });

  it('keeps the scale top above the highest tick', () => {
    const { ticks, top } = valueTicks(2900);
    expect(ticks).toEqual([1000, 2000, 3000]);
    expect(top).toBeGreaterThan(3000);
  });

  it('handles small and zero values', () => {
    expect(valueTicks(1000).ticks).toEqual([250, 500, 750]);
    expect(valueTicks(37).ticks).toEqual([10, 20, 30]);
    expect(valueTicks(0).ticks).toEqual([1, 2, 3]);
  });
});

describe('wholePercentages', () => {
  it('rounds so the shares sum to exactly 100', () => {
    expect(wholePercentages([5977, 1301, 812])).toEqual([74, 16, 10]);
    expect(wholePercentages([1, 1, 1])).toEqual([34, 33, 33]);
    const many = wholePercentages([7, 7, 7, 7, 7, 7]);
    expect(many.reduce((s, v) => s + v, 0)).toBe(100);
  });

  it('returns zeros for an empty total', () => {
    expect(wholePercentages([0, 0])).toEqual([0, 0]);
    expect(wholePercentages([])).toEqual([]);
  });
});
