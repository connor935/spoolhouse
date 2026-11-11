// Fixed E2E fixtures, shared by the seed (e2e/seed.ts) and the specs, so the
// expected nav counts below always match what the seed wrote.

export const E2E_PASSWORD = 'e2e-password-not-secret';

export const users = {
  admin: { email: 'e2e-admin@example.org', name: 'Ada Admin' },
  member: { email: 'e2e-member@example.org', name: 'Max Member' },
  // In no group at seed time: social.desktop.spec.ts builds its own group
  // with them, so the counts below stay what the shell specs expect.
  lender: { email: 'e2e-lender@example.org', name: 'Lea Lender' },
  borrower: { email: 'e2e-borrower@example.org', name: 'Ben Borrower' },
} as const;

export const GROUP_NAME = 'E2E Makers';

/** What the sidebar must show for each user right after seeding. */
export const expected = {
  member: {
    inventory: 2, // 3 spools, one of them empty
    borrowRequests: 1, // the admin asked to borrow one of them
    unread: 3, // 3 unread + 1 read notification
    groupShared: 3, // member's 2 non-empty + admin's 1
  },
  admin: {
    inventory: 1,
    borrowRequests: 0,
    unread: 0,
    groupShared: 3,
    pendingMaterials: 2,
    pendingSpoolTypes: 1,
  },
} as const;

export const authFile = (who: keyof typeof users) => `e2e/.auth/${who}.json`;
