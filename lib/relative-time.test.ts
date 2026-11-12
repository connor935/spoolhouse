import { describe, expect, it } from 'vitest';

import { formatAgoShort } from './relative-time';

const NOW = new Date('2026-11-11T12:00:00Z');
const before = (ms: number) => new Date(NOW.getTime() - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('formatAgoShort', () => {
  it.each([
    [0, 'just now'],
    [30_000, 'just now'],
    [5 * MIN, '5 min ago'],
    [59 * MIN, '59 min ago'],
    [2 * HOUR, '2 h ago'],
    [23 * HOUR, '23 h ago'],
    [DAY, '1 d ago'],
    [29 * DAY, '29 d ago'],
    [60 * DAY, '2 mo ago'],
    [400 * DAY, '1 y ago'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatAgoShort(before(ms), NOW)).toBe(expected);
  });

  it('treats a future date (clock skew) as just now', () => {
    expect(formatAgoShort(new Date(NOW.getTime() + HOUR), NOW)).toBe(
      'just now'
    );
  });
});
