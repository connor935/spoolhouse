import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { notifications, notificationTimes } from '@/stories/fixtures/social';
import { NotificationsView } from './notifications-view';

const keys = Object.keys(notifications) as (keyof typeof notifications)[];

const meta = {
  title: 'Pages/Notifications',
  component: NotificationsView,
  parameters: { layout: 'padded' },
  args: {
    items: keys.map((k) => ({
      item: notifications[k],
      time: notificationTimes[k],
    })),
    onRespond: fn(),
  },
} satisfies Meta<typeof NotificationsView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Notifications board: open requests first, then answered / closed. */
export const Default: Story = {};

export const Empty: Story = { args: { items: [] } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
