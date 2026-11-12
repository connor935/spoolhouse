import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { buildBottomNav } from '@/lib/nav';
import { emptyCounts, memberCounts } from '@/stories/fixtures/nav';
import { BottomNav } from './bottom-nav';

const meta = {
  title: 'Shell/BottomNav',
  component: BottomNav,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'mobile' } },
  args: { items: buildBottomNav(memberCounts), activeKey: 'inventory' },
} satisfies Meta<typeof BottomNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** MobileInventory.dc.html: Stock active, one open borrow request. */
export const Default: Story = {};

export const NothingWaiting: Story = {
  args: { items: buildBottomNav(emptyCounts), activeKey: 'overview' },
};

export const Dark: Story = { globals: { theme: 'dark' } };
