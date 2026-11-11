import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { Button } from '@/components/ui/button';
import {
  adminCounts,
  adminUser,
  memberCounts,
  memberUser,
} from '@/stories/fixtures/nav';
import { NavDrawer } from './nav-drawer';

const meta = {
  title: 'Shell/NavDrawer',
  component: NavDrawer,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'mobile' } },
  args: {
    open: true,
    onOpenChange: fn(),
    counts: adminCounts,
    user: adminUser,
    activeKey: 'overview',
    theme: 'dark',
    onThemeChange: fn(),
    onSignOut: fn(),
  },
  render: function Render(args) {
    const [open, setOpen] = useState(args.open);
    return (
      <div className="p-4">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open navigation
        </Button>
        <NavDrawer
          {...args}
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            args.onOpenChange(next);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof NavDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** MobileDrawer.dc.html (shown in dark there). */
export const Admin: Story = { globals: { theme: 'dark' } };

export const Member: Story = {
  args: {
    counts: memberCounts,
    user: memberUser,
    activeKey: 'group:group-kiel',
    theme: 'system',
  },
};

export const Closed: Story = { args: { open: false } };
