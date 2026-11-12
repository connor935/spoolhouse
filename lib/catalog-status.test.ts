import { describe, expect, it } from 'vitest';

import { countByStatus } from './catalog-status';

describe('countByStatus', () => {
  it('fills missing statuses with 0 and ignores unknown ones', () => {
    expect(
      countByStatus([
        { status: 'pending', value: 3 },
        { status: 'approved', value: 120 },
        { status: 'legacy', value: 9 },
      ])
    ).toEqual({ approved: 120, pending: 3, rejected: 0 });
  });
});
