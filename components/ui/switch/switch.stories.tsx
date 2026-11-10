import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Switch } from './switch';

const meta = {
  title: 'UI/Switch',
  component: Switch,
  args: {
    'aria-label': 'Trusted contributor: Anna Weber',
    onCheckedChange: fn(),
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = { args: { defaultChecked: true } };

export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const WithLabel: Story = {
  args: { 'aria-label': undefined },
  render: (args) => (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm">
      <Switch {...args} />
      Trusted contributor
    </label>
  ),
};
