import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Meter } from './meter';

const meta = {
  title: 'Design/Meter',
  component: Meter,
  args: { value: 74, 'aria-label': 'Spool #01 filament left' },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Meter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Full: Story = { args: { value: 100 } };

export const Low: Story = { args: { value: 9, tone: 'low' } };

export const Empty: Story = { args: { value: 0, tone: 'low' } };

/** Out-of-range input is clamped to 0–100. */
export const Overfull: Story = { args: { value: 130 } };
