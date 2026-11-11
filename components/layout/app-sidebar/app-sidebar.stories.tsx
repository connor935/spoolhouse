import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import {
  adminCounts,
  adminUser,
  emptyCounts,
  memberCounts,
  memberUser,
} from '@/stories/fixtures/nav';
import { AppSidebar } from './app-sidebar';

const meta = {
  title: 'Shell/AppSidebar',
  component: AppSidebar,
  parameters: { layout: 'fullscreen' },
  args: {
    counts: adminCounts,
    user: adminUser,
    activeKey: 'overview',
    collapsed: false,
    onCollapsedChange: fn(),
    theme: 'system',
    onThemeChange: fn(),
    onSignOut: fn(),
  },
  // Keep the collapse button working in Storybook while still reporting the
  // call to the actions panel.
  render: function Render(args) {
    const [collapsed, setCollapsed] = useState(args.collapsed);
    return (
      <AppSidebar
        {...args}
        collapsed={collapsed}
        onCollapsedChange={(next) => {
          setCollapsed(next);
          args.onCollapsedChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof AppSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Expanded 240px, admin: Catalog + Admin sections, review pills. */
export const Admin: Story = {};

/** Members don't see the Admin section. */
export const Member: Story = {
  args: { counts: memberCounts, user: memberUser, activeKey: 'statistics' },
};

/** A group page is open: its sub-item carries the active bar. */
export const GroupActive: Story = {
  args: { activeKey: 'group:group-farm' },
};

/** Collapsed 56px rail: icons with tooltips, pills on the icon corner. */
export const Collapsed: Story = {
  args: { collapsed: true, activeKey: 'borrows' },
};

/** Fresh account: no badges, no group sub-items. */
export const Empty: Story = {
  args: { counts: emptyCounts, user: memberUser },
};

export const Dark: Story = {
  globals: { theme: 'dark' },
};

export const CollapsedDark: Story = {
  args: { collapsed: true },
  globals: { theme: 'dark' },
};
