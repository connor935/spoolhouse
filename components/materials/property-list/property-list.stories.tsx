import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import {
  propertyDefinitions,
  propertyValues,
} from '@/stories/fixtures/material-detail';

import { PropertyList } from './property-list';

const meta = {
  title: 'Design/PropertyList',
  component: PropertyList,
  args: {
    values: propertyValues,
    definitions: propertyDefinitions,
    isAdmin: false,
    onSave: fn(() => true),
    onVerify: fn(),
    onDelete: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[720px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PropertyList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Member view: edit any value, unverified tags on member edits. */
export const Member: Story = {};

/** Admin view: Verify on unverified values, Delete on every row. */
export const Admin: Story = { args: { isAdmin: true } };

export const Empty: Story = { args: { values: [] } };

/** Every definition already has a value: no "Add property". */
export const Complete: Story = {
  args: { definitions: propertyDefinitions.slice(0, 6) },
};

export const Pending: Story = { args: { isAdmin: true, pending: true } };

export const Mobile: Story = {
  args: { isAdmin: true },
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
