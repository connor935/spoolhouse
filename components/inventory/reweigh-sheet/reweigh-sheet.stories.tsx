import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { daysAgo, FIXTURE_NOW, spools } from '@/stories/fixtures/inventory';
import { ReweighSheet } from './reweigh-sheet';

const meta = {
  title: 'Design/ReweighSheet',
  component: ReweighSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    title: 'Re-weigh #01 Galaxy Black',
    spool: spools.inUse,
    lastWeighedAt: daysAgo(5),
    now: FIXTURE_NOW,
    onSave: fn(),
    onEditDetails: fn(),
  },
  globals: { viewport: { value: 'mobile' } },
} satisfies Meta<typeof ReweighSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Owned: Story = {};

/** Reweigh board, mobile: a spool borrowed from someone else. */
export const Borrowed: Story = {
  args: {
    title: 'Re-weigh #04 Basic Cyan',
    borrowedFromName: 'Mia Koch',
    defaultMeasuredGrams: 877,
    onEditDetails: undefined,
  },
};
