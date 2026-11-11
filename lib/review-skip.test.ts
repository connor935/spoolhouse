import { describe, expect, it } from 'vitest';

import { parseReviewSkip } from './review-skip';

describe('parseReviewSkip', () => {
  it.each([
    [undefined, 0],
    ['3', 3],
    ['-1', 0],
    ['1.5', 0],
    ['abc', 0],
    [['2', '4'], 0],
    ['999999999', 100_000],
  ])('%j → %i', (value, expected) => {
    expect(parseReviewSkip(value)).toBe(expected);
  });
});
