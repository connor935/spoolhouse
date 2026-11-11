import { describe, expect, it } from 'vitest';
import {
  historyEntry,
  lendSpool,
  splitLends,
  type BorrowLend,
} from '@/lib/borrows';

const ME = 'user-me';
const OTHER = 'user-other';

let seq = 0;
function lend(
  overrides: Partial<BorrowLend['lend']> = {},
  row: Partial<Omit<BorrowLend, 'lend'>> = {}
): BorrowLend {
  seq += 1;
  return {
    lend: {
      id: `lend-${seq}`,
      status: 'requested',
      borrowerId: OTHER,
      requestedAt: new Date('2026-11-01T10:00:00Z'),
      respondedAt: null,
      returnedAt: null,
      startWeightGrams: null,
      endWeightGrams: null,
      ...overrides,
    },
    ownerId: ME,
    ownerName: 'Me Myself',
    borrowerName: 'Other Person',
    groupName: 'Print Farm',
    materialName: 'Galaxy Black',
    materialColor: '#111111',
    spoolNumber: 2,
    measuredTotalWeightGrams: 1000,
    fullFilamentWeightGrams: 1000,
    pricePaidCents: 2500,
    ...row,
  };
}

describe('splitLends', () => {
  it('sorts each lend into the section the current user sees it in', () => {
    const incoming = lend({ status: 'requested', borrowerId: OTHER });
    const outgoing = lend(
      { status: 'requested', borrowerId: ME },
      { ownerId: OTHER }
    );
    const lentOut = lend({ status: 'active', borrowerId: OTHER });
    const borrowed = lend(
      { status: 'active', borrowerId: ME },
      { ownerId: OTHER }
    );
    const returned = lend({ status: 'returned' });
    const declined = lend(
      { status: 'declined', borrowerId: ME },
      { ownerId: OTHER }
    );

    const split = splitLends(
      [incoming, outgoing, lentOut, borrowed, returned, declined],
      ME
    );

    expect(split.incoming).toEqual([incoming]);
    expect(split.outgoing).toEqual([outgoing]);
    expect(split.lentOut).toEqual([lentOut]);
    expect(split.borrowed).toEqual([borrowed]);
    expect(split.history).toEqual([returned, declined]);
  });

  it('orders history by when the lend ended, newest first', () => {
    const oldReturn = lend({
      status: 'returned',
      requestedAt: new Date('2026-10-01T00:00:00Z'),
      respondedAt: new Date('2026-10-01T00:00:00Z'),
      returnedAt: new Date('2026-10-05T00:00:00Z'),
    });
    const recentDecline = lend({
      status: 'declined',
      requestedAt: new Date('2026-09-01T00:00:00Z'),
      respondedAt: new Date('2026-10-20T00:00:00Z'),
    });
    expect(splitLends([oldReturn, recentDecline], ME).history).toEqual([
      recentDecline,
      oldReturn,
    ]);
  });
});

describe('lendSpool', () => {
  it('carries name, colour and the owner-side number', () => {
    expect(lendSpool(lend())).toEqual({
      materialName: 'Galaxy Black',
      color: '#111111',
      number: 2,
    });
  });
});

describe('historyEntry', () => {
  it('a returned lend of my spool: out, approval → return, used grams and cost', () => {
    const row = lend({
      status: 'returned',
      respondedAt: new Date('2026-09-02T10:00:00Z'),
      returnedAt: new Date('2026-09-18T10:00:00Z'),
      startWeightGrams: 900,
      endWeightGrams: 700,
    });
    expect(historyEntry(row, ME)).toMatchObject({
      id: row.lend.id,
      direction: 'out',
      counterpartName: 'Other Person',
      groupName: 'Print Farm',
      status: 'returned',
      startedAt: new Date('2026-09-02T10:00:00Z'),
      endedAt: new Date('2026-09-18T10:00:00Z'),
      usedGrams: 200,
      // 200 g × (2500 ct / 1000 g)
      costCents: 500,
    });
  });

  it('a declined request I made: in, request date, no usage', () => {
    const row = lend(
      { status: 'declined', borrowerId: ME },
      { ownerId: OTHER, ownerName: 'Owner Person' }
    );
    expect(historyEntry(row, ME)).toMatchObject({
      direction: 'in',
      counterpartName: 'Owner Person',
      status: 'declined',
      startedAt: row.lend.requestedAt,
      endedAt: null,
      usedGrams: null,
      costCents: null,
    });
  });

  it('no cost without a price, no usage before weight snapshots', () => {
    const unpriced = lend(
      { status: 'returned', startWeightGrams: 900, endWeightGrams: 800 },
      { pricePaidCents: null }
    );
    expect(historyEntry(unpriced, ME)).toMatchObject({
      usedGrams: 100,
      costCents: null,
    });
    const legacy = lend({ status: 'returned', startWeightGrams: null });
    expect(historyEntry(legacy, ME)).toMatchObject({
      usedGrams: null,
      costCents: null,
    });
  });
});
