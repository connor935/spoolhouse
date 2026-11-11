import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import {
  groupNames,
  history,
  lendSpools,
  people,
} from '@/stories/fixtures/social';
import { BorrowsView } from './borrows-view';

const meta = {
  title: 'Pages/Borrows',
  component: BorrowsView,
  parameters: { layout: 'padded' },
  args: {
    incoming: [
      {
        id: 'lend-1',
        spool: lendSpools.prusaOrange3,
        requesterName: people.anna.name,
        groupName: groupNames.farm,
        time: '3 h ago',
        dateTime: '2026-11-11T09:00:00Z',
        filamentLeftGrams: 655,
      },
      {
        id: 'lend-2',
        spool: lendSpools.silkGold2,
        requesterName: people.lena.name,
        groupName: groupNames.kiel,
        time: 'yesterday',
        dateTime: '2026-11-10T09:00:00Z',
        filamentLeftGrams: 980,
      },
    ],
    outgoing: [
      {
        id: 'lend-3',
        spool: lendSpools.galaxyBlack5,
        ownerName: people.jonas.name,
        groupName: groupNames.farm,
        time: '1 d ago',
        dateTime: '2026-11-10T08:00:00Z',
      },
    ],
    lentOut: [
      {
        id: 'lend-4',
        spool: lendSpools.galaxyBlack2,
        borrowerName: people.jonas.name,
        groupName: groupNames.farm,
        since: new Date('2026-10-12T10:00:00Z'),
        usedGrams: 58,
      },
    ],
    borrowed: [
      {
        id: 'lend-5',
        spool: lendSpools.basicCyan4,
        ownerName: people.mia.name,
        groupName: groupNames.farm,
        since: new Date('2026-11-07T10:00:00Z'),
        filamentLeftGrams: 318,
        percentLeft: 32,
      },
    ],
    history,
    onApprove: fn(),
    onDecline: fn(),
    onCancel: fn(),
    onMarkReturned: fn(),
    onWeigh: fn(),
  },
} satisfies Meta<typeof BorrowsView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Borrows board: all five sections filled. */
export const Default: Story = {};

/** An approve running on the first request. */
export const Pending: Story = { args: { pendingId: 'lend-1' } };

/** A new user: every section says what will show up there. */
export const Empty: Story = {
  args: { incoming: [], outgoing: [], lentOut: [], borrowed: [], history: [] },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
