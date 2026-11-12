import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { SelectField } from './select-field';

const SORT_ITEMS = [
  { value: 'name', label: 'Name' },
  { value: 'left', label: 'Filament left' },
  { value: 'recent', label: 'Recently weighed' },
] as const;

type Sort = (typeof SORT_ITEMS)[number]['value'];

const meta = {
  title: 'Design/SelectField',
  component: SelectField<Sort>,
  args: {
    items: SORT_ITEMS,
    value: 'name',
    onValueChange: fn(),
    ariaLabel: 'Sort by',
  },
  render: function Render(args) {
    const [value, setValue] = useState<Sort>(args.value);
    return (
      <SelectField
        {...args}
        value={value}
        onValueChange={(v) => {
          setValue(v);
          args.onValueChange(v);
        }}
      />
    );
  },
} satisfies Meta<typeof SelectField<Sort>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Wide: Story = { args: { triggerClassName: 'w-56' } };
