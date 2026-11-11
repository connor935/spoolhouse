import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_NAV_ITEM,
  badgeText,
  buildBottomNav,
  buildNav,
  findActiveKey,
  flattenNav,
  type NavCounts,
} from './nav';

const counts: NavCounts = {
  inventory: 14,
  borrowRequests: 1,
  unreadNotifications: 12,
  groups: [
    { id: 'g1', name: 'Print Farm Friends', sharedCount: 23 },
    { id: 'g2', name: 'Makerspace Kiel', sharedCount: 0 },
  ],
  pendingMaterials: 7,
  pendingSpoolTypes: 0,
};

describe('buildNav', () => {
  it('hides the admin section from members', () => {
    expect(buildNav(counts, false).map((s) => s.key)).toEqual([
      'main',
      'catalog',
    ]);
    expect(buildNav(counts, true).map((s) => s.key)).toEqual([
      'main',
      'catalog',
      'admin',
    ]);
  });

  it('uses accent pills for waiting work and muted counts for totals', () => {
    const items = flattenNav(buildNav(counts, true));
    const byKey = Object.fromEntries(items.map((i) => [i.key, i.badge]));
    expect(byKey.inventory).toEqual({
      value: 14,
      tone: 'count',
      label: '14 spools in stock',
    });
    expect(byKey.borrows).toEqual({
      value: 1,
      tone: 'pill',
      label: '1 open request',
    });
    expect(byKey.notifications?.tone).toBe('pill');
    expect(byKey['review-materials']).toMatchObject({ value: 7, tone: 'pill' });
    expect(byKey['group:g1']).toMatchObject({ value: 23, tone: 'count' });
  });

  it('drops badges for zero counts', () => {
    const items = flattenNav(buildNav(counts, true));
    const byKey = Object.fromEntries(items.map((i) => [i.key, i.badge]));
    expect(byKey['review-spool-types']).toBeUndefined();
    expect(byKey['group:g2']).toBeUndefined();
  });

  it('lists one sub-item per group under Groups', () => {
    const groups = buildNav(counts, false)[0].items.find(
      (i) => i.key === 'groups'
    );
    expect(groups?.children?.map((c) => [c.label, c.href])).toEqual([
      ['Print Farm Friends', '/groups/g1'],
      ['Makerspace Kiel', '/groups/g2'],
    ]);
  });
});

describe('badgeText', () => {
  it('caps pills at 9+ but never plain counts', () => {
    expect(badgeText({ value: 12, tone: 'pill', label: '' })).toBe('9+');
    expect(badgeText({ value: 9, tone: 'pill', label: '' })).toBe('9');
    expect(badgeText({ value: 61, tone: 'count', label: '' })).toBe('61');
  });
});

describe('findActiveKey', () => {
  const items = [...flattenNav(buildNav(counts, true)), ACCOUNT_NAV_ITEM];

  it.each([
    ['/', 'overview'],
    ['/inventory', 'inventory'],
    ['/groups', 'groups'],
    ['/groups/g1', 'group:g1'],
    ['/groups/g1/', 'group:g1'],
    ['/groups/unknown', 'groups'],
    ['/admin/materials', 'review-materials'],
    ['/admin/materials/review', 'review-materials'],
    ['/account', 'account'],
    ['/api-docs', null],
    ['/materialsx', null],
  ])('%s → %s', (path, key) => {
    expect(findActiveKey(path, items)).toBe(key);
  });

  it('maps a group page to Groups in the bottom nav', () => {
    expect(findActiveKey('/groups/g1', buildBottomNav(counts))).toBe('groups');
    expect(findActiveKey('/stats', buildBottomNav(counts))).toBe('statistics');
  });
});
