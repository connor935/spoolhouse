import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { daysAgo, FIXTURE_NOW, spools } from '@/stories/fixtures/inventory';
import { ReweighForm } from './reweigh-form';

const meta = {
  title: 'Design/ReweighForm',
  component: ReweighForm,
  args: {
    spool: spools.full,
    lastWeighedAt: daysAgo(14),
    now: FIXTURE_NOW,
    onSave: fn(),
    onEditDetails: fn(),
  },
  decorators: [
    (Story) => (
      <div className="border-ink bg-card w-80 rounded-[6px] border p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReweighForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on the spool's current total: no change yet. */
export const Default: Story = {};

/** Reweigh board: #03 Galaxy Black, 1,193 g → 1,112 g. */
export const Typed: Story = { args: { defaultMeasuredGrams: 1112 } };

/** Below the empty spool weight: clamps to 0 g left. */
export const BelowEmpty: Story = { args: { defaultMeasuredGrams: 150 } };

export const Borrowed: Story = {
  args: { spool: spools.inUse, borrowed: true, defaultMeasuredGrams: 877 },
};

export const Pending: Story = {
  args: { defaultMeasuredGrams: 1112, pending: true },
};

export const Sheet: Story = {
  args: {
    size: 'sheet',
    spool: spools.inUse,
    borrowed: true,
    defaultMeasuredGrams: 877,
  },
  decorators: [
    (Story) => (
      <div className="bg-card w-[390px] max-w-full p-[18px]">
        <Story />
      </div>
    ),
  ],
  globals: { viewport: { value: 'mobile' } },
};
