import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { SectionHeader } from '@/components/common/section-header';
import { Button } from '@/components/ui/button';
import { groupNames, lendSpools, people } from '@/stories/fixtures/social';

import { LendLine } from './lend-line';

const meta = {
  title: 'Design/LendLine',
  component: LendLine,
  args: {
    direction: 'out',
    spool: lendSpools.galaxyBlack2,
    counterpartName: people.jonas.name,
    since: new Date('2026-10-12T10:00:00Z'),
    usedGrams: 58,
  },
  decorators: [
    (Story) => (
      <div className="max-w-[900px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LendLine>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Your spool with someone else; only you can end it. */
export const LentOut: Story = {
  args: {
    action: (
      <Button variant="outline" size="sm" onClick={fn()}>
        Mark returned
      </Button>
    ),
  },
};

/** Approved today: nothing used yet, so no "so far". */
export const LentOutJustNow: Story = {
  args: { usedGrams: 0, since: new Date('2026-11-10T09:00:00Z') },
};

/** Someone's spool with you: you re-weigh it, the owner ends the lend. */
export const Borrowed: Story = {
  args: {
    direction: 'in',
    spool: lendSpools.basicCyan4,
    counterpartName: people.mia.name,
    since: new Date('2026-11-07T10:00:00Z'),
    usedGrams: null,
    groupName: groupNames.farm,
    filamentLeftGrams: 318,
    percentLeft: 32,
    action: (
      <Button variant="outline" size="sm" onClick={fn()}>
        Weigh
      </Button>
    ),
  },
};

/** Borrows 03 + 04. */
export const Sections: Story = {
  render: () => (
    <div className="flex flex-col gap-9">
      <section>
        <SectionHeader index="03" title="Lent out" />
        <LendLine {...meta.args} {...LentOut.args} />
      </section>
      <section>
        <SectionHeader index="04" title="Borrowed by you" />
        <LendLine {...meta.args} {...Borrowed.args} />
      </section>
    </div>
  ),
};

export const Mobile: Story = {
  ...Sections,
  globals: { viewport: { value: 'mobile' } },
};
