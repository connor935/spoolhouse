import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { adminUser, memberUser } from '@/stories/fixtures/nav';
import { UserMenu } from './user-menu';

const meta = {
  title: 'Shell/UserMenu',
  component: UserMenu,
  args: {
    user: adminUser,
    theme: 'system',
    onThemeChange: fn(),
    onSignOut: fn(),
  },
  decorators: [
    (Story) => (
      <div className="bg-sidebar flex h-[340px] w-60 flex-col justify-end p-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sidebar footer row (name, role, chevrons). */
export const Default: Story = {};

/** Sidebar.dc.html "user menu open". */
export const Open: Story = {
  args: { defaultOpen: true },
};

/** On /account the trigger carries the active style. */
export const Active: Story = {
  args: { user: memberUser, active: true },
};

/** Rail trigger of the collapsed sidebar; the menu opens to the right. */
export const Collapsed: Story = {
  args: { collapsed: true },
  decorators: [
    (Story) => (
      <div className="w-14">
        <Story />
      </div>
    ),
  ],
};

export const OpenDark: Story = {
  args: { defaultOpen: true, theme: 'dark' },
  globals: { theme: 'dark' },
};
