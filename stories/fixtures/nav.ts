// Shared story/test fixtures for the app shell (sidebar, drawer, bottom nav),
// matching the Sidebar / Nav / MobileDrawer / MobileInventory boards. Typed
// against NavCounts from lib/nav.ts.
import type { NavCounts, NavUser } from '@/lib/nav';
import { groupNames } from './social';

export const memberUser: NavUser = { name: 'Felix', isAdmin: false };
export const adminUser: NavUser = { name: 'Felix', isAdmin: true };

export const memberCounts: NavCounts = {
  inventory: 14,
  borrowRequests: 1,
  unreadNotifications: 4,
  groups: [
    { id: 'group-farm', name: groupNames.farm, sharedCount: 23 },
    { id: 'group-kiel', name: groupNames.kiel, sharedCount: 61 },
  ],
  pendingMaterials: null,
  pendingSpoolTypes: null,
};

export const adminCounts: NavCounts = {
  ...memberCounts,
  pendingMaterials: 7,
  pendingSpoolTypes: 2,
};

/** A fresh account: nothing waiting, no groups. */
export const emptyCounts: NavCounts = {
  inventory: 0,
  borrowRequests: 0,
  unreadNotifications: 0,
  groups: [],
  pendingMaterials: null,
  pendingSpoolTypes: null,
};
