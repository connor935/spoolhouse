import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { groupNames, people } from '@/stories/fixtures/social';
import { JoinGroupCard } from './join-group-card';

const meta = {
  title: 'Pages/JoinGroup',
  component: JoinGroupCard,
  parameters: { layout: 'centered' },
  args: {
    name: groupNames.farm,
    linkLabel: '…/groups/join/aB3xY9',
    memberCount: 5,
    sharedSpoolCount: 23,
    ownerName: people.anna.name,
    groupHref: '/groups/group-farm',
    onJoin: fn(),
  },
} satisfies Meta<typeof JoinGroupCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** JoinGroup board. */
export const Default: Story = {};

export const Joining: Story = { args: { joining: true } };

export const AlreadyMember: Story = { args: { alreadyMember: true } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
