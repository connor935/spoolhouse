import { describe, expect, it } from 'vitest';
import { monthYear, relativeTime, shortDate } from '@/lib/dates';

describe('monthYear', () => {
  it('formats month + year in UTC', () => {
    expect(monthYear(new Date('2026-03-31T23:30:00Z'))).toBe('Mar 2026');
  });
});

const NOW = new Date('2026-11-11T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('shortDate', () => {
  it('formats day + month in UTC without the year', () => {
    expect(shortDate(new Date('2026-09-02T23:30:00Z'))).toBe('02 Sep');
    expect(shortDate(new Date('2026-12-31T00:00:00Z'))).toBe('31 Dec');
  });
});

describe('relativeTime', () => {
  it.each([
    [0, 'just now'],
    [59 * 1000, 'just now'],
    [MIN, '1 min ago'],
    [59 * MIN, '59 min ago'],
    [HOUR, '1 h ago'],
    [23 * HOUR, '23 h ago'],
    [DAY, 'yesterday'],
    [2 * DAY, '2 d ago'],
    [6 * DAY, '6 d ago'],
  ])('%i ms ago → %s', (ms, expected) => {
    expect(relativeTime(ago(ms), NOW)).toBe(expected);
  });

  it('falls back to the short date from a week on', () => {
    expect(relativeTime(ago(7 * DAY), NOW)).toBe('04 Nov');
    expect(relativeTime(new Date('2026-09-18T08:00:00Z'), NOW)).toBe('18 Sep');
  });

  it('treats future dates (clock skew) as just now', () => {
    expect(relativeTime(new Date(NOW.getTime() + 5 * MIN), NOW)).toBe(
      'just now'
    );
  });
});
