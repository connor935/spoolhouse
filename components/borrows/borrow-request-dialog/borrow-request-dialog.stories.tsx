import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { groupNames, people } from '@/stories/fixtures/social';

import { BorrowRequestDialog } from './borrow-request-dialog';

const meta = {
  title: 'Design/BorrowRequestDialog',
  component: BorrowRequestDialog,
  args: {
    request: {
      requesterName: people.anna.name,
      materialName: 'Prusa Orange',
      groupName: groupNames.farm,
      time: 'just now',
      spool: {
        number: 3,
        color: '#F26B21',
        filamentType: 'PETG',
        location: 'B1',
        filamentLeftGrams: 655,
        percentLeft: 66,
      },
    },
    onClose: fn(),
    onApprove: fn(),
    onDecline: fn(),
  },
} satisfies Meta<typeof BorrowRequestDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** From a notification row: only the snapshot names are known. */
export const WithoutSpool: Story = {
  args: {
    request: {
      requesterName: people.lena.name,
      materialName: 'Silk Gold #2',
      groupName: groupNames.kiel,
      time: '12 min ago',
    },
  },
};

export const Pending: Story = { args: { pending: true } };

export const Closed: Story = { args: { request: null } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
