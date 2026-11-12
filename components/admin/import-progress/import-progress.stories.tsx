import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ImportProgress } from './import-progress';

const queue = ['esun', 'prusament', 'sunlu'];

const meta = {
  title: 'Design/ImportProgress',
  component: ImportProgress,
  args: {
    state: { status: 'running', queue, index: 1 },
    onRetry: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[880px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ImportProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

/** AdminImport board: "Importing 2 of 3 — prusament…". */
export const Running: Story = {};

export const Failed: Story = {
  args: {
    state: {
      status: 'failed',
      queue,
      index: 1,
      message: 'SpoolmanDB returned 502 Bad Gateway.',
    },
  },
};

/** Stopped on the first manufacturer: nothing imported. */
export const FailedFirst: Story = {
  args: {
    state: {
      status: 'failed',
      queue,
      index: 0,
      message: 'GitHub rate limit reached.',
    },
  },
};

export const Done: Story = { args: { state: { status: 'done', queue } } };

export const DoneSingle: Story = {
  args: { state: { status: 'done', queue: ['polymaker'] } },
};
