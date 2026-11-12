import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { SectionHeader } from '@/components/common/section-header';
import { ME, people } from '@/stories/fixtures/social';

import { MemberRow } from './member-row';

const meta = {
  title: 'Design/MemberRow',
  component: MemberRow,
  args: {
    name: people.lena.name,
    role: 'member',
    meta: 'joined Mar 2026 · shares 9',
    onRemove: fn(),
  },
  render: (args) => (
    <ul className="m-0 max-w-[900px] list-none p-0">
      <MemberRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof MemberRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What the owner sees for a plain member. */
export const Removable: Story = {};

/** Removing is refused while the member has an active lend. */
export const RemoveBlocked: Story = {
  args: {
    name: people.paul.name,
    meta: 'joined Oct 2026 · shares 4 · 1 active lend',
    removeDisabledReason: 'Mark active lends returned first',
  },
};

export const You: Story = {
  args: {
    name: 'Felix',
    you: true,
    role: 'owner',
    meta: undefined,
    onRemove: undefined,
  },
};

/** A member's view: nobody can be removed. */
export const ReadOnly: Story = { args: { onRemove: undefined } };

/** GroupSettings 04, as the owner. */
export const MembersSection: Story = {
  render: (args) => (
    <section className="max-w-[900px]">
      <SectionHeader
        index="04"
        title="Members"
        aside={<span className="kicker">12</span>}
      />
      <ul className="m-0 list-none p-0">
        <MemberRow name={ME.name.split(' ')[0]} role="owner" you />
        <MemberRow {...args} />
        <MemberRow {...args} {...RemoveBlocked.args} />
      </ul>
      <p className="kicker border-border border-t pt-3">+ 9 more members</p>
    </section>
  ),
};

export const Mobile: Story = {
  ...MembersSection,
  globals: { viewport: { value: 'mobile' } },
};
