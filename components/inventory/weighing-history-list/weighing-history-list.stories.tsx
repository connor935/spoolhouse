import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { WeighingHistoryList } from './weighing-history-list';

const at = (iso: string) => new Date(iso);

const meta = {
  title: 'Design/WeighingHistoryList',
  component: WeighingHistoryList,
  args: {
    emptyWeightGrams: 193,
    timeZone: 'UTC',
    weighings: [
      { id: 'w4', grams: 935, measuredAt: at('2026-11-10T14:02:00Z') },
      { id: 'w3', grams: 993, measuredAt: at('2026-11-03T09:15:00Z') },
      { id: 'w2', grams: 1098, measuredAt: at('2026-10-21T18:40:00Z') },
      { id: 'w1', grams: 1193, measuredAt: at('2026-03-14T11:00:00Z') },
    ],
    onUndo: fn(),
  },
  decorators: [
    (Story) => (
      <div className="bg-card w-[512px] max-w-full p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WeighingHistoryList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** SpoolEdit board: "E Weighing history" with Undo last. */
export const Default: Story = {};

export const Undoing: Story = { args: { undoing: true } };

/** Only the first weighing: nothing to undo to. */
export const Single: Story = {
  args: {
    weighings: [
      { id: 'w1', grams: 1193, measuredAt: at('2026-03-14T11:00:00Z') },
    ],
  },
};

export const Loading: Story = { args: { weighings: null } };
