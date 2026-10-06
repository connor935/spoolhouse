import { describe, expect, it } from 'vitest';
import { isMaterialShared } from '@/lib/share-mode';

const listed = new Set(['m1']);

describe('isMaterialShared', () => {
  it("'all' shares everything regardless of the list", () => {
    expect(isMaterialShared('all', listed, 'm1')).toBe(true);
    expect(isMaterialShared('all', listed, 'm2')).toBe(true);
  });
  it('whitelist shares only listed materials', () => {
    expect(isMaterialShared('whitelist', listed, 'm1')).toBe(true);
    expect(isMaterialShared('whitelist', listed, 'm2')).toBe(false);
  });
  it('blacklist shares everything except listed materials', () => {
    expect(isMaterialShared('blacklist', listed, 'm1')).toBe(false);
    expect(isMaterialShared('blacklist', listed, 'm2')).toBe(true);
  });
});
