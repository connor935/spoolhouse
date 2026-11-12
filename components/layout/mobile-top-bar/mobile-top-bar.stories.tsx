import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { MobileTopBar } from './mobile-top-bar';

const meta = {
  title: 'Shell/MobileTopBar',
  component: MobileTopBar,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'mobile' } },
  args: { unreadNotifications: 4, onOpenNav: fn() },
} satisfies Meta<typeof MobileTopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** MobileInventory.dc.html header with an unread dot on the bell. */
export const Default: Story = {};

export const NothingUnread: Story = { args: { unreadNotifications: 0 } };

export const Dark: Story = { globals: { theme: 'dark' } };
