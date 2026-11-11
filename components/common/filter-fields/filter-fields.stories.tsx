import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { fn } from 'storybook/test';
import { EMPTY_FILTER_VALUE } from '@/lib/filter-value';
import {
  filterProperties,
  patternsFilterValue,
} from '@/stories/fixtures/catalog';
import { FilterFields } from './filter-fields';

const meta = {
  title: 'Design/FilterFields',
  component: FilterFields,
  args: {
    value: EMPTY_FILTER_VALUE,
    onChange: fn(),
    showMinLeft: true,
    properties: filterProperties,
  },
  // Controlled component: the story keeps the value so edits show up.
  render: function Render(args) {
    const [value, setValue] = React.useState(args.value);
    return (
      <FilterFields
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    );
  },
  decorators: [
    (Story) => (
      <div className="max-w-[1040px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FilterFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Inventory: types, min remaining, property ranges. */
export const Panel: Story = {};

export const Prefilled: Story = { args: { value: patternsFilterValue } };

/** Group stock adds the hide-lent switch. */
export const GroupStock: Story = { args: { showHideLent: true } };

/** Catalog: materials have no weight, so no min remaining. */
export const Catalog: Story = { args: { showMinLeft: false } };

/** Stacked, with 44px inputs, as inside FilterSheet. */
export const Sheet: Story = {
  args: { layout: 'sheet', value: patternsFilterValue },
  decorators: [
    (Story) => (
      <div className="w-[354px] max-w-full">
        <Story />
      </div>
    ),
  ],
  globals: { viewport: { value: 'mobile' } },
};
