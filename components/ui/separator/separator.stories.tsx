import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Separator } from './separator';

const meta = {
  title: 'UI/Separator',
  component: Separator,
  args: { variant: 'default', orientation: 'horizontal' },
  render: (args) => (
    <div className="flex w-80 flex-col gap-3">
      <span className="kicker">Above</span>
      <Separator {...args} />
      <span className="kicker">Below</span>
    </div>
  ),
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Ink: Story = { args: { variant: 'ink' } };

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <div className="flex h-6 items-center gap-3">
      <span className="kicker">14 spools</span>
      <Separator {...args} />
      <span className="kicker">3.2 kg left</span>
    </div>
  ),
};
