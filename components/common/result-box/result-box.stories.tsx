import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { formatWeight } from '@/lib/filament';
import { ResultBox } from './result-box';

const meta = {
  title: 'Design/ResultBox',
  component: ResultBox,
  decorators: [
    (Story) => (
      <div className="max-w-[560px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ResultBox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Spool form: the live "Calculated filament left" line. */
export const Default: Story = {
  args: {
    role: 'status',
    children: (
      <>
        <span className="kicker">Calculated filament left</span>
        <span className="display-weight ml-auto">{formatWeight(742)}</span>
      </>
    ),
  },
};

/** AdminImport: a running job, stacked with a meter. */
export const Progress: Story = {
  args: {
    role: 'status',
    className: 'flex-col items-stretch gap-2.5',
    children: (
      <>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium">
            Importing 2 of 3 — <span className="font-mono">prusament</span>…
          </span>
          <span className="kicker">esun ✓ · prusament · sunlu</span>
        </div>
        <div className="bg-muted mask-segments relative h-3">
          <i className="bg-accent absolute inset-y-0 left-0 w-1/2" />
        </div>
      </>
    ),
  },
};
