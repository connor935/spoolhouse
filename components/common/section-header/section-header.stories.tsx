import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Link from 'next/link';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SectionHeader } from './section-header';

const meta = {
  title: 'Design/SectionHeader',
  component: SectionHeader,
  args: { index: '02', title: 'Running low' },
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Overview: "02 Running low ───── Inventory →". */
export const WithLink: Story = {
  args: { aside: <Link href="/inventory">Inventory →</Link> },
};

export const WithKicker: Story = {
  args: {
    index: '03',
    title: 'Monthly usage',
    aside: <span className="kicker">Last 12 months</span>,
  },
};

/** Statistics: a segmented unit toggle in the aside slot. */
export const WithControl: Story = {
  args: {
    index: '01',
    title: 'Monthly usage',
    aside: (
      <ToggleGroup aria-label="Unit" defaultValue={['grams']}>
        <ToggleGroupItem value="grams">Grams</ToggleGroupItem>
        <ToggleGroupItem value="cost">Cost</ToggleGroupItem>
      </ToggleGroup>
    ),
  },
};

export const WithoutNumber: Story = {
  args: { index: undefined, title: 'Properties' },
};
