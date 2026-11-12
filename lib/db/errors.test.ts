import { describe, expect, it } from 'vitest';
import { isUniqueViolation } from './errors';

const C = 'filaments_user_id_tag_uid_unique';

describe('isUniqueViolation', () => {
  it('matches a pg unique violation of the named constraint', () => {
    expect(isUniqueViolation({ code: '23505', constraint: C }, C)).toBe(true);
  });

  it('looks through Drizzle wrapping at the cause', () => {
    const wrapped = new Error('Failed query', {
      cause: { code: '23505', constraint: C },
    });
    expect(isUniqueViolation(wrapped, C)).toBe(true);
  });

  it.each([
    ['another constraint', { code: '23505', constraint: 'other' }],
    ['another SQLSTATE', { code: '23503', constraint: C }],
    ['a cause without a code', { cause: { constraint: C } }],
    ['a non-object cause', { cause: 'boom' }],
    ['a plain Error', new Error('x')],
    ['null', null],
    ['a string', '23505'],
  ])('is false for %s', (_, error) => {
    expect(isUniqueViolation(error, C)).toBe(false);
  });
});
