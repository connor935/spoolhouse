import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { duplicateCandidates, reviewEntry } from '@/stories/fixtures/catalog';
import { DuplicateCandidateRow } from '../duplicate-candidate-row';
import { ReviewSummary } from './review-summary';

const meta = {
  title: 'Design/ReviewSummary',
  component: ReviewSummary,
  args: {
    entry: {
      ...reviewEntry.material,
      tag: reviewEntry.material.filamentType,
    },
    manufacturerEntryCount: 142,
    submitter: { name: 'Anna Weber', trusted: false },
    submittedAgo: '2 h ago',
    spoolCount: 1,
    spoolOwners: ['Anna Weber'],
  },
  decorators: [
    (Story) => (
      <div className="border-ink bg-card max-w-[760px] rounded-[4px] border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReviewSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ReviewQueue board: a pending request from a regular user. */
export const Pending: Story = {};

export const NewManufacturer: Story = {
  args: {
    manufacturerEntryCount: 0,
    submitter: { name: 'Jonas Becker', trusted: true },
    spoolCount: 0,
    spoolOwners: [],
  },
};

export const Imported: Story = {
  args: {
    submitter: null,
    submittedAgo: '3 d ago',
    spoolCount: 4,
    spoolOwners: [],
  },
};

export const NoColour: Story = {
  args: {
    entry: { ...reviewEntry.material, tag: 'PLA', color: null },
  },
};

/** A spool-type request: no swatch, the empty weight as its tag. */
export const SpoolType: Story = {
  args: {
    entry: {
      manufacturer: 'Polymaker',
      name: 'Cardboard 3 kg',
      status: 'pending',
      tag: '520 g',
    },
    noun: 'spool type',
    tagLabel: 'Empty spool',
    manufacturerEntryCount: 3,
    spoolCount: 0,
    spoolOwners: [],
  },
};

/**
 * ReviewQueue board composed: the summary card with its action bar, and the
 * possible-duplicates list beside it.
 */
export const Queue: Story = {
  decorators: [],
  render: (args) => (
    <div className="flex max-w-[1200px] flex-wrap items-start gap-6">
      <article className="border-ink bg-card min-w-0 flex-[3_1_600px] rounded-[4px] border">
        <ReviewSummary {...args} />
        <div className="border-ink flex items-center gap-2.5 border-t p-[18px]">
          <Button variant="destructive-outline" size="lg">
            Reject <Kbd>R</Kbd>
          </Button>
          <Button variant="outline" size="lg">
            Edit <Kbd>E</Kbd>
          </Button>
          <span className="flex-1" />
          <Button variant="ghost">
            Skip <Kbd>J</Kbd>
          </Button>
          <Button size="lg" className="min-w-[180px]">
            Approve <Kbd>A</Kbd>
          </Button>
        </div>
      </article>
      <aside className="min-w-0 flex-[2_1_360px]">
        <h2 className="display-section mb-4">Possible duplicates</h2>
        {duplicateCandidates.map((c) => (
          <DuplicateCandidateRow key={c.entry.id} {...c} />
        ))}
      </aside>
    </div>
  ),
};
