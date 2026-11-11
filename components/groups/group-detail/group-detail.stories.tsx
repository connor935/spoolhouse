import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { farmMembers, groupNames } from '@/stories/fixtures/social';
import { GroupDetail } from './group-detail';

const meta = {
  title: 'Pages/Group',
  component: GroupDetail,
  parameters: { layout: 'padded' },
  args: {
    name: groupNames.farm,
    members: farmMembers,
    meta: '5 members · 23 shared spools · 15 materials',
    inviteCode: 'aB3xY9',
    onCopyInvite: fn(),
    view: 'stock',
    href: '/groups/group-farm',
    children: (
      <p className="text-muted-foreground text-sm">
        The Stock or Settings view renders here.
      </p>
    ),
  },
} satisfies Meta<typeof GroupDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Stock: Story = {};

export const Settings: Story = { args: { view: 'settings' } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
