import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ToggleGroup, ToggleGroupItem } from './toggle-group';

const meta = {
  title: 'UI/ToggleGroup',
  component: ToggleGroup,
  args: {
    'aria-label': 'Status',
    defaultValue: ['stock'],
    onValueChange: fn(),
  },
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Inventory status seg (`.seg`, Patterns board section 01). */
export const WithCounts: Story = {
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="stock" count={14}>
        In stock
      </ToggleGroupItem>
      <ToggleGroupItem value="empty" count={5}>
        Empty
      </ToggleGroupItem>
      <ToggleGroupItem value="all" count={19}>
        All
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Plain: Story = {
  args: { 'aria-label': 'Chart', defaultValue: ['grams'] },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="grams">Grams</ToggleGroupItem>
      <ToggleGroupItem value="cost">Cost</ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const WithDisabledItem: Story = {
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="stock" count={14}>
        In stock
      </ToggleGroupItem>
      <ToggleGroupItem value="empty" count={0} disabled>
        Empty
      </ToggleGroupItem>
      <ToggleGroupItem value="all" count={14}>
        All
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};
