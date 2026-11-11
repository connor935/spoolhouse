import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import {
  groupNames,
  ME,
  people,
  shareableMaterials,
  whitelistIds,
} from '@/stories/fixtures/social';
import { GroupSettingsView } from './group-settings-view';

const meta = {
  title: 'Pages/Group/Settings',
  component: GroupSettingsView,
  parameters: { layout: 'padded' },
  args: {
    groupName: groupNames.kiel,
    currentUserId: ME.id,
    isOwner: true,
    sharing: { mode: 'whitelist', selectedIds: whitelistIds },
    materials: shareableMaterials,
    onSaveSharing: fn(),
    inviteCode: 'aB3xY9',
    inviteLink: 'https://spoolhouse.example.org/groups/join/aB3xY9',
    onRotate: fn(),
    onRename: fn(),
    members: [
      {
        id: ME.id,
        name: ME.name,
        role: 'owner',
        meta: 'joined Jan 2026 · shares 6',
        activeLends: 0,
      },
      {
        id: people.lena.id,
        name: people.lena.name,
        role: 'member',
        meta: 'joined Mar 2026 · shares 9',
        activeLends: 0,
      },
      {
        id: people.paul.id,
        name: people.paul.name,
        role: 'member',
        meta: 'joined Oct 2026 · shares 4 · 1 active lend',
        activeLends: 1,
      },
    ],
    onRemove: fn(),
    groupActiveLends: 0,
    onDelete: fn(),
    onLeave: fn(),
  },
} satisfies Meta<typeof GroupSettingsView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** GroupSettings board, owner variant. */
export const Owner: Story = {};

/** Delete refused while a lend in the group is active. */
export const OwnerDeleteBlocked: Story = { args: { groupActiveLends: 1 } };

/** Member variant: sharing + leave only. */
export const Member: Story = {
  args: {
    isOwner: false,
    members: [
      {
        id: people.lena.id,
        name: people.lena.name,
        role: 'owner',
        meta: '',
        activeLends: 0,
      },
      { id: ME.id, name: ME.name, role: 'member', meta: '', activeLends: 0 },
    ],
  },
};

export const MemberLeaveBlocked: Story = {
  args: {
    ...Member.args,
    members: [
      { id: ME.id, name: ME.name, role: 'member', meta: '', activeLends: 1 },
    ],
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
