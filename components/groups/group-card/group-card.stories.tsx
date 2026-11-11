import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SectionHeader } from '@/components/common/section-header';
import {
  farmMembers,
  groupNames,
  kielMembers,
} from '@/stories/fixtures/social';

import { GroupCard } from './group-card';

const meta = {
  title: 'Design/GroupCard',
  component: GroupCard,
  args: {
    name: groupNames.farm,
    href: '/groups/group-farm',
    role: 'member',
    members: farmMembers,
    sharedSpoolCount: 23,
    youShareCount: 6,
  },
  decorators: [
    (Story) => (
      <div className="max-w-[420px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GroupCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Member: Story = {};

/** Twelve members: the stack shows four and "+8". */
export const Owner: Story = {
  args: {
    name: groupNames.kiel,
    href: '/groups/group-kiel',
    role: 'owner',
    members: kielMembers,
    sharedSpoolCount: 61,
    youShareCount: 14,
  },
};

/** Groups 01. */
export const YourGroups: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-[900px]">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <section>
      <SectionHeader index="01" title="Your groups" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-4">
        <GroupCard {...args} />
        <GroupCard {...args} {...Owner.args} />
      </div>
    </section>
  ),
};

export const Mobile: Story = {
  ...YourGroups,
  globals: { viewport: { value: 'mobile' } },
};
