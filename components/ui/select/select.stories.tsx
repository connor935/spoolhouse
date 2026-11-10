import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';

const types = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon'];

const meta = {
  title: 'UI/Select',
  component: SelectTrigger,
  args: {
    'aria-label': 'Filament type',
    className: 'w-56',
    onValueChange: fn(),
  },
  render: ({ onValueChange, defaultValue, open, ...args }) => (
    <Select
      items={types.map((t) => ({ value: t, label: t }))}
      defaultValue={defaultValue}
      defaultOpen={open}
      onValueChange={onValueChange}
    >
      <SelectTrigger {...args}>
        <SelectValue placeholder="All types" />
      </SelectTrigger>
      <SelectContent>
        {types.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
} satisfies Meta<
  React.ComponentProps<typeof SelectTrigger> & {
    onValueChange: (value: unknown) => void;
    defaultValue?: string;
    open?: boolean;
  }
>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};

export const WithValue: Story = { args: { defaultValue: 'PETG' } };

export const Ink: Story = { args: { variant: 'ink', defaultValue: 'PLA' } };

export const Invalid: Story = { args: { 'aria-invalid': true } };

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'ABS' },
};

export const Small: Story = { args: { size: 'sm', defaultValue: 'TPU' } };

/** The `.pop` / `.opt` popup, open. */
export const Open: Story = { args: { defaultValue: 'PETG', open: true } };

export const Grouped: Story = {
  render: ({ onValueChange, ...args }) => (
    <Select defaultOpen onValueChange={onValueChange}>
      <SelectTrigger {...args}>
        <SelectValue placeholder="Pick a spool type" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Prusament</SelectLabel>
          <SelectItem value="prusa-cardboard">Cardboard 1 kg</SelectItem>
          <SelectItem value="prusa-plastic">Plastic 1 kg</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Sunlu</SelectLabel>
          <SelectItem value="sunlu-plastic">Plastic 1 kg</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};
