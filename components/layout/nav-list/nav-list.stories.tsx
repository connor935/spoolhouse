import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { buildNav } from '@/lib/nav';
import { adminCounts, memberCounts } from '@/stories/fixtures/nav';
import { NavList } from './nav-list';

const meta = {
  title: 'Shell/NavList',
  component: NavList,
  args: {
    sections: buildNav(adminCounts, true),
    activeKey: 'notifications',
    onNavigate: fn(),
  },
  decorators: [
    (Story) => (
      <div className="bg-sidebar w-60 p-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NavList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sidebar size (36px rows). */
export const Default: Story = {};

/** Drawer size (44px rows), member without the Admin section. */
export const Large: Story = {
  args: {
    size: 'lg',
    sections: buildNav(memberCounts, false),
    activeKey: 'overview',
  },
  decorators: [
    (Story) => (
      <div className="w-[304px]">
        <Story />
      </div>
    ),
  ],
};

export const Dark: Story = {
  globals: { theme: 'dark' },
};
