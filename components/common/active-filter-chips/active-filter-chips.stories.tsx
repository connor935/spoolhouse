import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { fn } from 'storybook/test';
import { filterChips, removeFilterChip } from '@/lib/filter-value';
import {
  filterProperties,
  patternsFilterValue,
} from '@/stories/fixtures/catalog';
import { ActiveFilterChips } from './active-filter-chips';

const meta = {
  title: 'Design/ActiveFilterChips',
  component: ActiveFilterChips,
  args: {
    chips: filterChips(patternsFilterValue, filterProperties),
    onRemove: fn(),
  },
} satisfies Meta<typeof ActiveFilterChips>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** CatalogMaterials board: one property range. */
export const Single: Story = {
  args: {
    chips: [{ id: 'prop:prop-density', label: 'Density 1.2–1.3 g/cm³' }],
  },
};

/** Removing a chip drops that filter from the value. */
export const Interactive: Story = {
  render: function Render(args) {
    const [value, setValue] = React.useState(patternsFilterValue);
    return (
      <ActiveFilterChips
        chips={filterChips(value, filterProperties)}
        onRemove={(id) => {
          setValue(removeFilterChip(value, id));
          args.onRemove(id);
        }}
      />
    );
  },
};

/** No active filters: renders nothing. */
export const Empty: Story = { args: { chips: [] } };
