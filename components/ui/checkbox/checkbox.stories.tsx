import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Checkbox } from './checkbox';

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  args: { onCheckedChange: fn() },
  render: (args) => (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox {...args} />
      Hide lent spools
    </label>
  ),
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Indeterminate: Story = { args: { indeterminate: true } };

export const Invalid: Story = { args: { 'aria-invalid': true } };

export const Disabled: Story = {
  args: { disabled: true, defaultChecked: true },
};

/** The AdminImport checkbox list. */
export const List: Story = {
  render: (args) => (
    <div className="border-ink flex w-80 flex-col border-t-2">
      {['Bambu Lab', 'eSun', 'Extrudr', 'Polymaker'].map((name, i) => (
        <label
          key={name}
          className="border-border flex cursor-pointer items-center gap-2.5 border-b py-3 text-sm"
        >
          <Checkbox {...args} defaultChecked={i === 1} />
          <span className="flex-1">{name}</span>
        </label>
      ))}
    </div>
  ),
};
