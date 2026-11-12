import { describe, expect, it } from 'vitest';

import { uniqueBy } from './unique-by';

describe('uniqueBy', () => {
  it('keeps the first item per key, in order', () => {
    const rows = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'a', v: 3 },
    ];
    expect(uniqueBy(rows, (r) => r.id)).toEqual([
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ]);
  });
});
