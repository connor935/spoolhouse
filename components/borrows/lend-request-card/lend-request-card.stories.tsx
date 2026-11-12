import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { SectionHeader } from '@/components/common/section-header';
import { groupNames, lendSpools, people } from '@/stories/fixtures/social';

import { LendRequestCard } from './lend-request-card';

const meta = {
  title: 'Design/LendRequestCard',
  component: LendRequestCard,
  args: {
    direction: 'incoming',
    spool: lendSpools.prusaOrange3,
    counterpartName: people.anna.name,
    groupName: groupNames.farm,
    time: '3 h ago',
    filamentLeftGrams: 655,
    onApprove: fn(),
    onDecline: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[420px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LendRequestCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Incoming: Story = {};

export const IncomingPending: Story = { args: { pending: true } };

export const Outgoing: Story = {
  args: {
    direction: 'outgoing',
    spool: lendSpools.galaxyBlack5,
    counterpartName: people.jonas.name,
    time: '1 d ago',
    filamentLeftGrams: undefined,
    onApprove: undefined,
    onDecline: undefined,
    onCancel: fn(),
  },
};

/** Borrows 01: requests for your spools. */
export const RequestsSection: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-[900px]">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <section>
      <SectionHeader
        index="01"
        title="Requests for your spools"
        aside={<span className="kicker">2</span>}
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-3.5">
        <LendRequestCard {...args} />
        <LendRequestCard
          {...args}
          spool={lendSpools.silkGold2}
          counterpartName={people.lena.name}
          groupName={groupNames.kiel}
          time="yesterday"
          filamentLeftGrams={980}
        />
      </div>
    </section>
  ),
};

/** Borrows 02: your own open requests. */
export const YourRequestsSection: Story = {
  args: Outgoing.args,
  render: (args) => (
    <section>
      <SectionHeader index="02" title="Your requests" />
      <LendRequestCard {...args} />
    </section>
  ),
};

export const Mobile: Story = {
  ...RequestsSection,
  globals: { viewport: { value: 'mobile' } },
};
