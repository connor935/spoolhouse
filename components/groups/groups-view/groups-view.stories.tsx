import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import {
  farmMembers,
  groupNames,
  kielMembers,
} from '@/stories/fixtures/social';
import { GroupsView } from './groups-view';

const meta = {
  title: 'Pages/Groups',
  component: GroupsView,
  parameters: { layout: 'padded' },
  args: {
    groups: [
      {
        id: 'group-farm',
        name: groupNames.farm,
        role: 'member',
        members: farmMembers,
        sharedSpoolCount: 23,
        youShareCount: 6,
      },
      {
        id: 'group-kiel',
        name: groupNames.kiel,
        role: 'owner',
        members: kielMembers,
        sharedSpoolCount: 61,
        youShareCount: 14,
      },
    ],
    onCreate: fn(),
    onJoin: fn(),
  },
} satisfies Meta<typeof GroupsView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Groups board. */
export const Default: Story = {};

export const NoGroups: Story = { args: { groups: [] } };

export const Creating: Story = { args: { creating: true } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
