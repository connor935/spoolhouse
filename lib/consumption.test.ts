import { describe, expect, it } from 'vitest';
import {
  dailyRate,
  forecastDays,
  formatDays,
  monthlyUsage,
  usageEvents,
} from '@/lib/consumption';

const d = (iso: string) => new Date(iso);

describe('usageEvents', () => {
  it('counts drops per spool and ignores increases', () => {
    const events = usageEvents([
      { spoolId: 'a', grams: 1200, measuredAt: d('2026-01-01') },
      { spoolId: 'a', grams: 1000, measuredAt: d('2026-01-10') },
      { spoolId: 'a', grams: 1100, measuredAt: d('2026-01-12') }, // correction
      { spoolId: 'a', grams: 900, measuredAt: d('2026-01-20') },
      { spoolId: 'b', grams: 500, measuredAt: d('2026-01-05') },
      { spoolId: 'b', grams: 450, measuredAt: d('2026-01-06') },
    ]);
    expect(events.map((e) => [e.spoolId, e.grams])).toEqual([
      ['b', 50],
      ['a', 200],
      ['a', 200],
    ]);
  });

  it('sorts each spool by time regardless of input order', () => {
    const events = usageEvents([
      { spoolId: 'a', grams: 800, measuredAt: d('2026-02-01') },
      { spoolId: 'a', grams: 1000, measuredAt: d('2026-01-01') },
    ]);
    expect(events).toEqual([{ spoolId: 'a', at: d('2026-02-01'), grams: 200 }]);
  });
});

describe('monthlyUsage', () => {
  it('returns every month in the window, oldest first, with zeros', () => {
    const events = [
      { spoolId: 'a', at: d('2026-03-15T10:00:00Z'), grams: 100 },
      { spoolId: 'a', at: d('2026-05-02T10:00:00Z'), grams: 40 },
      { spoolId: 'a', at: d('2025-01-01T10:00:00Z'), grams: 999 }, // outside
    ];
    expect(monthlyUsage(events, 3, d('2026-05-20T00:00:00Z'))).toEqual([
      { month: '2026-03', value: 100 },
      { month: '2026-04', value: 0 },
      { month: '2026-05', value: 40 },
    ]);
  });
});

describe('dailyRate / forecastDays', () => {
  const now = d('2026-03-01T00:00:00Z');
  const events = [{ spoolId: 'a', at: d('2026-02-20T00:00:00Z'), grams: 300 }];

  it('averages over the window, or the tracked time when shorter', () => {
    expect(dailyRate(events, now, d('2025-01-01'), 60)).toBeCloseTo(5);
    expect(dailyRate(events, now, d('2026-02-01T00:00:00Z'), 60)).toBeCloseTo(
      300 / 28
    );
  });

  it('never extrapolates from less than a week', () => {
    const fresh = [{ spoolId: 'a', at: d('2026-02-28T00:00:00Z'), grams: 70 }];
    expect(dailyRate(fresh, now, d('2026-02-27T00:00:00Z'))).toBeCloseTo(10);
  });

  it('gives no forecast without usage', () => {
    expect(forecastDays(500, 0)).toBeNull();
    expect(forecastDays(500, 5)).toBe(100);
  });
});

describe('formatDays', () => {
  it('picks a readable unit', () => {
    expect(formatDays(0.5)).toBe('less than a day');
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(20)).toBe('3 weeks');
    expect(formatDays(100)).toBe('3 months');
    expect(formatDays(1000)).toBe('over 2 years');
  });
});
