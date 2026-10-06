import { describe, expect, it } from 'vitest';
import { matchRank, matchesTokens, searchTokens } from '@/lib/search';

describe('searchTokens', () => {
  it('lowercases and splits on any whitespace', () => {
    expect(searchTokens('  Polymaker\tPETG  red ')).toEqual([
      'polymaker',
      'petg',
      'red',
    ]);
  });
});

describe('matchesTokens', () => {
  const fields = ['Polymaker', 'PolyLite Red', 'PETG'] as const;

  it('matches tokens spread across fields', () => {
    expect(matchesTokens(searchTokens('polymaker petg red'), ...fields)).toBe(
      true
    );
  });
  it('requires every token', () => {
    expect(matchesTokens(searchTokens('polymaker blue'), ...fields)).toBe(
      false
    );
  });
  it('matches everything for an empty query and skips null fields', () => {
    expect(matchesTokens([], ...fields)).toBe(true);
    expect(matchesTokens(['red'], null, undefined, 'Red')).toBe(true);
  });
});

describe('matchRank', () => {
  it('ranks a field prefix above a mid-word hit', () => {
    expect(matchRank(['poly'], 'Polymaker')).toBe(0);
    expect(matchRank(['maker'], 'Polymaker')).toBe(1);
  });
});
