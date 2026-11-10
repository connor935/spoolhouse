import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { WeightDisplay } from './weight-display';

const meta = {
  title: 'Design/WeightDisplay',
  component: WeightDisplay,
  args: { grams: 742 },
} satisfies Meta<typeof WeightDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tile: Story = {};

export const Kilograms: Story = { args: { grams: 2160, size: 'block' } };

export const Readout: Story = { args: { grams: 919, size: 'readout' } };

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-baseline gap-6">
      <WeightDisplay {...args} size="tile" />
      <WeightDisplay {...args} size="block" />
      <WeightDisplay {...args} size="readout" />
    </div>
  ),
};
