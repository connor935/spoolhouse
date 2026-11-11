// Shared story/test fixtures for the borrow, group and notification surfaces,
// matching the Borrows / Notifications / BorrowDialog / Groups / Group /
// GroupSettings design boards. Typed against the real read results
// (`NotificationWithStatus`, `SharedSpool`), so a schema change breaks them.
import type { NotificationWithStatus } from '@/app/actions/notifications';
import type { AvatarPerson } from '@/components/common/avatar-stack';
import type { LendHistoryEntry } from '@/components/borrows/lend-history-table';
import type { LendSpool } from '@/components/borrows/lend-spool-label';
import type { ShareableMaterial } from '@/components/groups/share-mode-picker';
import type { SharedSpool } from '@/lib/sharing';

import { daysAgo, FIXTURE_NOW, materials, spools } from './inventory';

export { FIXTURE_NOW };

export const ME = { id: 'user-felix', name: 'Felix Kratz' };

export const people = {
  anna: { id: 'user-anna', name: 'Anna Weber' },
  jonas: { id: 'user-jonas', name: 'Jonas Brandt' },
  mia: { id: 'user-mia', name: 'Mia Koch' },
  tom: { id: 'user-tom', name: 'Tom Richter' },
  lena: { id: 'user-lena', name: 'Lena Schulz' },
  paul: { id: 'user-paul', name: 'Paul Neumann' },
  kai: { id: 'user-kai', name: 'Kai Hansen' },
};

export const groupNames = {
  farm: 'Print Farm Friends',
  kiel: 'Makerspace Kiel',
};

// --- Borrows board -------------------------------------------------------

export const lendSpools = {
  prusaOrange3: { materialName: 'Prusa Orange', color: '#F26B21', number: 3 },
  silkGold2: { materialName: 'Silk Gold', color: '#C9A23F', number: 2 },
  galaxyBlack5: { materialName: 'Galaxy Black', color: '#1F1F1F', number: 5 },
  galaxyBlack2: { materialName: 'Galaxy Black', color: '#1F1F1F', number: 2 },
  basicCyan4: { materialName: 'Basic Cyan', color: '#0086D6', number: 4 },
  prusaOrange2: { materialName: 'Prusa Orange', color: '#F26B21', number: 2 },
  desertTan1: { materialName: 'Desert Tan', color: '#E4BD68', number: 1 },
  mint1: { materialName: 'Mint', color: '#9ADBC0', number: 1 },
  graphite7: { materialName: 'Graphite', color: '#4A4E54', number: 7 },
} satisfies Record<string, LendSpool>;

export const history: LendHistoryEntry[] = [
  {
    id: 'lend-h1',
    spool: lendSpools.prusaOrange2,
    direction: 'out',
    counterpartName: people.tom.name,
    groupName: groupNames.farm,
    status: 'returned',
    startedAt: new Date('2026-09-02T10:00:00Z'),
    endedAt: new Date('2026-09-18T10:00:00Z'),
    usedGrams: 212,
    costCents: 530,
  },
  {
    id: 'lend-h2',
    spool: lendSpools.desertTan1,
    direction: 'in',
    counterpartName: people.mia.name,
    groupName: groupNames.farm,
    status: 'returned',
    startedAt: new Date('2026-08-14T10:00:00Z'),
    endedAt: new Date('2026-08-22T10:00:00Z'),
    usedGrams: 58,
    costCents: 145,
  },
  {
    id: 'lend-h3',
    spool: lendSpools.mint1,
    direction: 'out',
    counterpartName: people.lena.name,
    groupName: groupNames.kiel,
    status: 'declined',
    startedAt: new Date('2026-07-30T10:00:00Z'),
    endedAt: null,
    usedGrams: null,
    costCents: null,
  },
  {
    id: 'lend-h4',
    spool: lendSpools.graphite7,
    direction: 'in',
    counterpartName: people.jonas.name,
    groupName: groupNames.farm,
    status: 'cancelled',
    startedAt: new Date('2026-07-11T10:00:00Z'),
    endedAt: null,
    usedGrams: null,
    costCents: null,
  },
];

// --- Notifications board -------------------------------------------------

const minutesAgo = (m: number) =>
  new Date(FIXTURE_NOW.getTime() - m * 60 * 1000);

function notification(
  id: string,
  fields: Pick<
    NotificationWithStatus['notification'],
    'type' | 'actorName' | 'filamentName' | 'groupName' | 'createdAt'
  > & { read?: boolean; lendId?: string | null },
  lendStatus: string | null
): NotificationWithStatus {
  const { read, lendId = `lend-${id}`, ...rest } = fields;
  return {
    notification: {
      id,
      userId: ME.id,
      lendId,
      readAt: read ? FIXTURE_NOW : null,
      ...rest,
    },
    lendStatus,
  };
}

export const notifications = {
  /** Open request: actionable. */
  requested: notification(
    'n1',
    {
      type: 'lend_requested',
      actorName: people.anna.name,
      filamentName: 'Prusa Orange #3',
      groupName: groupNames.farm,
      createdAt: minutesAgo(0),
    },
    'requested'
  ),
  requested2: notification(
    'n2',
    {
      type: 'lend_requested',
      actorName: people.lena.name,
      filamentName: 'Silk Gold #2',
      groupName: groupNames.kiel,
      createdAt: minutesAgo(12),
    },
    'requested'
  ),
  approved: notification(
    'n3',
    {
      type: 'lend_approved',
      actorName: people.mia.name,
      filamentName: 'Basic Cyan #4',
      groupName: groupNames.farm,
      createdAt: minutesAgo(180),
    },
    'active'
  ),
  declined: notification(
    'n4',
    {
      type: 'lend_declined',
      actorName: people.jonas.name,
      filamentName: 'Graphite #7',
      groupName: groupNames.farm,
      createdAt: daysAgo(2),
    },
    'declined'
  ),
  returned: notification(
    'n5',
    {
      type: 'lend_returned',
      actorName: people.tom.name,
      filamentName: 'Prusa Orange #2',
      groupName: groupNames.farm,
      createdAt: new Date('2026-09-18T10:00:00Z'),
      read: true,
    },
    'returned'
  ),
  cancelled: notification(
    'n6',
    {
      type: 'lend_request_cancelled',
      actorName: people.jonas.name,
      filamentName: 'Graphite #7',
      groupName: groupNames.farm,
      createdAt: new Date('2026-07-11T10:00:00Z'),
      read: true,
      lendId: null,
    },
    null
  ),
  /** A request you already approved: no longer actionable. */
  answered: notification(
    'n7',
    {
      type: 'lend_requested',
      actorName: people.tom.name,
      filamentName: 'Galaxy Black #2',
      groupName: groupNames.farm,
      createdAt: daysAgo(5),
      read: true,
    },
    'active'
  ),
};

/** Display times as the page would format them against FIXTURE_NOW. */
export const notificationTimes: Record<keyof typeof notifications, string> = {
  requested: 'just now',
  requested2: '12 min ago',
  approved: '3 h ago',
  declined: '2 d ago',
  returned: '18 Sep',
  cancelled: '11 Jul',
  answered: '05 Nov',
};

// --- Groups ------------------------------------------------------------

const avatar = (
  p: { id: string; name: string },
  you = false
): AvatarPerson => ({
  ...p,
  you,
});

export const farmMembers: AvatarPerson[] = [
  avatar(ME, true),
  avatar(people.anna),
  avatar(people.jonas),
  avatar(people.mia),
  avatar(people.tom),
];

export const kielMembers: AvatarPerson[] = [
  avatar(ME, true),
  avatar(people.lena),
  avatar(people.paul),
  avatar(people.kai),
  ...Array.from({ length: 8 }, (_, i) =>
    avatar({ id: `user-kiel-${i}`, name: `Member ${i + 1}` })
  ),
];

/** Your materials on the GroupSettings checklist (14 spools in all). */
export const shareableMaterials: ShareableMaterial[] = [
  {
    id: 'mat-galaxy-black',
    name: 'Galaxy Black',
    filamentType: 'PLA',
    color: '#1F1F1F',
    spoolCount: 3,
  },
  {
    id: 'mat-mint',
    name: 'Mint',
    filamentType: 'PLA',
    color: '#9ADBC0',
    spoolCount: 2,
  },
  {
    id: 'mat-prusa-orange',
    name: 'Prusa Orange',
    filamentType: 'PETG',
    color: '#F26B21',
    spoolCount: 2,
  },
  {
    id: 'mat-graphite',
    name: 'Graphite',
    filamentType: 'ASA',
    color: '#4A4E54',
    spoolCount: 1,
  },
  {
    id: 'mat-silk-gold',
    name: 'Silk Gold',
    filamentType: 'PLA',
    color: '#C9A23F',
    spoolCount: 2,
  },
  {
    id: 'mat-basic-cyan',
    name: 'Basic Cyan',
    filamentType: 'PLA',
    color: '#0086D6',
    spoolCount: 1,
  },
  {
    id: 'mat-desert-tan',
    name: 'Desert Tan',
    filamentType: 'PLA',
    color: '#E4BD68',
    spoolCount: 3,
  },
];

/** Whitelist that makes the board's "6 of 14 spools visible". */
export const whitelistIds = ['mat-galaxy-black', 'mat-mint', 'mat-basic-cyan'];

// Group stock rows: real SpoolViews from the inventory fixtures, re-owned.
function shared(
  spool: (typeof spools)[keyof typeof spools],
  owner: { id: string; name: string },
  extra: Partial<Pick<SharedSpool, 'lentTo' | 'pendingRequest'>> = {}
): SharedSpool {
  return {
    ...spool,
    lentToName: null,
    material: materials.galaxyBlack,
    ownerId: owner.id,
    ownerName: owner.name,
    lentTo: null,
    pendingRequest: null,
    ...extra,
  };
}

export const stock = {
  /** Your own spool, nobody asked. */
  own: shared(spools.inUse, ME),
  /** Your spool, Anna asked for it. */
  ownRequested: shared(spools.full, ME, {
    pendingRequest: {
      lendId: 'lend-s1',
      borrowerId: people.anna.id,
      borrowerName: people.anna.name,
    },
  }),
  /** Your spool, with Jonas right now. */
  ownLent: shared(spools.lent, ME, {
    lentTo: {
      lendId: 'lend-s2',
      borrowerId: people.jonas.id,
      borrowerName: people.jonas.name,
      since: new Date('2026-10-12T10:00:00Z'),
    },
  }),
  /** Anna's spool, free to request. */
  available: shared(spools.full, people.anna),
  /** Jonas's spool, you asked for it. */
  requestedByYou: shared(spools.inUse, people.jonas, {
    pendingRequest: {
      lendId: 'lend-s3',
      borrowerId: ME.id,
      borrowerName: ME.name,
    },
  }),
  /** Anna's spool, Tom asked for it. */
  requestedByOther: shared(spools.inUse, people.anna, {
    pendingRequest: {
      lendId: 'lend-s4',
      borrowerId: people.tom.id,
      borrowerName: people.tom.name,
    },
  }),
  /** Mia's spool, with you. */
  withYou: shared(spools.low, people.mia, {
    lentTo: {
      lendId: 'lend-s5',
      borrowerId: ME.id,
      borrowerName: ME.name,
      since: new Date('2026-11-07T10:00:00Z'),
    },
  }),
  /** Tom's spool, with Lena. */
  lentToOther: shared(spools.inUse, people.tom, {
    lentTo: {
      lendId: 'lend-s6',
      borrowerId: people.lena.id,
      borrowerName: people.lena.name,
      since: new Date('2026-10-30T10:00:00Z'),
    },
  }),
} satisfies Record<string, SharedSpool>;
