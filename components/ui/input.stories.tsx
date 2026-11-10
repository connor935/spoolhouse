import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Input } from './input';

const meta = {
  title: 'UI/Input',
  component: Input,
  args: {
    'aria-label': 'Measured total weight (g)',
    placeholder: 'e.g. 1193',
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Numeric: Story = {
  args: { type: 'number', inputMode: 'numeric', defaultValue: 935 },
};

export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: '1,75' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: '193' },
};
