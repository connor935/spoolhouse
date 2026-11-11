import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { fn } from 'storybook/test';
import { Button } from '@/components/ui/button';
import {
  filterProperties,
  patternsFilterValue,
} from '@/stories/fixtures/catalog';
import { FilterSheet } from './filter-sheet';

const meta = {
  title: 'Design/FilterSheet',
  component: FilterSheet,
  args: {
    open: true,
    onOpenChange: fn(),
    value: patternsFilterValue,
    onChange: fn(),
    resultCount: 6,
    showMinLeft: true,
    properties: filterProperties,
  },
  // Controlled component: the story keeps open + value so it behaves live.
  render: function Render(args) {
    const [open, setOpen] = React.useState(args.open);
    const [value, setValue] = React.useState(args.value);
    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Filters
        </Button>
        <FilterSheet
          {...args}
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            args.onOpenChange(next);
          }}
          value={value}
          onChange={(next) => {
            setValue(next);
            args.onChange(next);
          }}
        />
      </>
    );
  },
  globals: { viewport: { value: 'mobile' } },
} satisfies Meta<typeof FilterSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** FiltersMobile board: "Show 6 spools". */
export const Inventory: Story = {};

export const Catalog: Story = {
  args: {
    showMinLeft: false,
    value: { ...patternsFilterValue, minLeftGrams: null },
    resultCount: 1,
    resultNoun: ['material', 'materials'],
  },
};
