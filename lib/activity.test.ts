import { describe, expect, it } from 'vitest';
import {
  activityTime,
  shapeActivity,
  type LendActivityRow,
  type WeighingActivityRow,
} from '@/lib/activity';

const d = (iso: string) => new Date(iso);
const ME = 'me';

function weighing(over: Partial<WeighingActivityRow>): WeighingActivityRow {
  return {
    id: 'w1',
    spoolId: 's1',
    grams: 935,
    previousGrams: 993,
    measuredAt: d('2026-11-10T14:02:00Z'),
    emptyWeightGrams: 193,
    materialName: 'Galaxy Black',
    ownerId: ME,
    actorId: ME,
    actorName: 'Felix',
    ...over,
  };
}

function lend(over: Partial<LendActivityRow>): LendActivityRow {
  return {
    id: 'l1',
    spoolId: 's3',
    status: 'requested',
    requestedAt: d('2026-11-10T11:40:00Z'),
    respondedAt: null,
    returnedAt: null,
    ownerId: ME,
    ownerName: 'Felix',
    borrowerId: 'anna',
    borrowerName: 'Anna Weber',
    materialName: 'Prusa Orange',
    ...over,
  };
}

describe('shapeActivity', () => {
  it('turns a weighing into filament left and the change since the previous one', () => {
    const [entry] = shapeActivity([weighing({})], [], ME);
    expect(entry).toEqual({
      kind: 'weigh',
      id: 'w:w1',
      at: d('2026-11-10T14:02:00Z'),
      spoolId: 's1',
      materialName: 'Galaxy Black',
      leftGrams: 742,
      deltaGrams: -58,
      byName: null,
    });
  });

  it('has no change for a spool’s first weighing and names other weighers', () => {
    const [entry] = shapeActivity(
      [weighing({ previousGrams: null, actorId: 'jonas', actorName: 'Jonas' })],
      [],
      ME
    );
    expect(entry).toMatchObject({ deltaGrams: null, byName: 'Jonas' });
  });

  it('clamps filament left at zero', () => {
    const [entry] = shapeActivity([weighing({ grams: 150 })], [], ME);
    expect(entry).toMatchObject({ leftGrams: 0 });
  });

  it('emits one entry per lend event, seen from the viewer’s side', () => {
    const entries = shapeActivity(
      [],
      [
        lend({
          status: 'returned',
          respondedAt: d('2026-11-05T09:00:00Z'),
          returnedAt: d('2026-11-08T09:00:00Z'),
          requestedAt: d('2026-11-04T09:00:00Z'),
        }),
        lend({
          id: 'l2',
          spoolId: 's4',
          status: 'active',
          ownerId: 'mia',
          ownerName: 'Mia Koch',
          borrowerId: ME,
          borrowerName: 'Felix',
          materialName: 'Basic Cyan',
          requestedAt: d('2026-11-09T08:00:00Z'),
          respondedAt: d('2026-11-09T10:00:00Z'),
        }),
      ],
      ME
    );
    expect(
      entries.map((e) =>
        e.kind === 'lend' ? [e.id, e.event, e.role, e.otherName] : e.id
      )
    ).toEqual([
      ['l:l2:approved', 'approved', 'borrower', 'Mia Koch'],
      ['l:l2:requested', 'requested', 'borrower', 'Mia Koch'],
      ['l:l1:returned', 'returned', 'owner', 'Anna Weber'],
      ['l:l1:approved', 'approved', 'owner', 'Anna Weber'],
      ['l:l1:requested', 'requested', 'owner', 'Anna Weber'],
    ]);
  });

  it('marks requests on the viewer’s spools that still wait for an answer', () => {
    const [open] = shapeActivity([], [lend({})], ME);
    expect(open).toMatchObject({ event: 'requested', pending: true });
    const [answered] = shapeActivity(
      [],
      [lend({ status: 'declined', respondedAt: d('2026-11-10T12:00:00Z') })],
      ME
    );
    expect(answered).toMatchObject({ event: 'declined', pending: false });
  });

  it('merges both sources newest first and caps the feed', () => {
    const entries = shapeActivity(
      [
        weighing({ id: 'a', measuredAt: d('2026-11-10T14:02:00Z') }),
        weighing({ id: 'b', measuredAt: d('2026-11-07T10:00:00Z') }),
      ],
      [lend({ requestedAt: d('2026-11-10T11:40:00Z') })],
      ME,
      2
    );
    expect(entries.map((e) => e.id)).toEqual(['w:a', 'l:l1:requested']);
  });
});

describe('activityTime', () => {
  const now = d('2026-11-10T15:00:00Z');

  it('shows the time today, "Yday" yesterday and the date before', () => {
    expect(activityTime(d('2026-11-10T14:02:00Z'), now, 'UTC')).toBe('14:02');
    expect(activityTime(d('2026-11-09T23:59:00Z'), now, 'UTC')).toBe('Yday');
    expect(activityTime(d('2026-11-07T10:00:00Z'), now, 'UTC')).toBe('07 Nov');
  });

  it('decides "today" in the given time zone', () => {
    // 23:30 UTC on the 9th is already the 10th in Berlin.
    expect(activityTime(d('2026-11-09T23:30:00Z'), now, 'Europe/Berlin')).toBe(
      '00:30'
    );
  });
});
