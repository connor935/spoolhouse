import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SectionHeader } from '@/components/common/section-header';
import { history } from '@/stories/fixtures/social';

import { LendHistoryTable } from './lend-history-table';

const meta = {
  title: 'Design/LendHistoryTable',
  component: LendHistoryTable,
  args: { entries: history },
} satisfies Meta<typeof LendHistoryTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A returned lend from before weight snapshots, and one on an unpriced spool. */
export const UnknownUsage: Story = {
  args: {
    entries: [
      { ...history[0], id: 'old', usedGrams: null, costCents: null },
      { ...history[1], id: 'unpriced', costCents: null },
    ],
  },
};

/** Borrows 05. */
export const HistorySection: Story = {
  render: (args) => (
    <section className="max-w-[1080px]">
      <SectionHeader index="05" title="History" />
      <LendHistoryTable {...args} />
    </section>
  ),
};

export const Mobile: Story = {
  ...HistorySection,
  globals: { viewport: { value: 'mobile' } },
};
