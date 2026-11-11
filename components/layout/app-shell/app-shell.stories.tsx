import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import {
  adminCounts,
  adminUser,
  memberCounts,
  memberUser,
} from '@/stories/fixtures/nav';
import { AppShell } from './app-shell';

const meta = {
  title: 'Shell/AppShell',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'desktop' } },
  args: {
    counts: adminCounts,
    user: adminUser,
    pathname: '/stats',
    collapsed: false,
    onCollapsedChange: fn(),
    theme: 'system',
    onThemeChange: fn(),
    onSignOut: fn(),
    children: (
      <>
        <PageHeader index="05" kicker="Statistics" title="Statistics" />
        <section className="flex flex-col gap-4">
          <SectionHeader index="01" title="Monthly usage" />
          <div className="bg-card border-border h-64 rounded-[4px] border" />
        </section>
      </>
    ),
  },
  render: function Render(args) {
    const [collapsed, setCollapsed] = useState(args.collapsed);
    return (
      <AppShell
        {...args}
        collapsed={collapsed}
        onCollapsedChange={(next) => {
          setCollapsed(next);
          args.onCollapsedChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Desktop 1440: expanded sidebar, page in the 1280px column. */
export const Desktop: Story = {};

export const DesktopCollapsed: Story = { args: { collapsed: true } };

export const DesktopDark: Story = { globals: { theme: 'dark' } };

/** Mobile 390: top bar + bottom nav; the menu button opens the drawer. */
export const Mobile: Story = {
  args: {
    counts: memberCounts,
    user: memberUser,
    pathname: '/groups/group-farm',
  },
  globals: { viewport: { value: 'mobile' } },
};

export const MobileDark: Story = {
  globals: { viewport: { value: 'mobile' }, theme: 'dark' },
};
