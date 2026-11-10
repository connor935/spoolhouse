import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { notifications, notificationTimes } from '@/stories/fixtures/social';

import { NotificationRow } from './notification-row';

const meta = {
  title: 'Design/NotificationRow',
  component: NotificationRow,
  args: {
    item: notifications.requested,
    time: notificationTimes.requested,
    onRespond: fn(),
  },
  // Rows are <li>s; the page owns the list.
  render: (args) => (
    <ul className="m-0 max-w-[920px] list-none p-0">
      <NotificationRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof NotificationRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Unread borrow request: Respond opens the BorrowRequestDialog. */
export const Actionable: Story = {};

export const Approved: Story = {
  args: { item: notifications.approved, time: notificationTimes.approved },
};

export const Declined: Story = {
  args: { item: notifications.declined, time: notificationTimes.declined },
};

/** Read rows are muted; names stay in the foreground colour. */
export const ReadReturned: Story = {
  args: { item: notifications.returned, time: notificationTimes.returned },
};

/** A request you already answered shows the lend's state, not Respond. */
export const AnsweredRequest: Story = {
  args: { item: notifications.answered, time: notificationTimes.answered },
};

/** The Notifications board, top to bottom. */
export const List: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-[920px]">
        <Story />
        <p className="kicker mt-4">
          Only borrow activity creates notifications.
        </p>
      </div>
    ),
  ],
  render: (args) => (
    <ul className="m-0 list-none p-0">
      {(
        [
          'requested',
          'requested2',
          'approved',
          'declined',
          'returned',
          'cancelled',
        ] as const
      ).map((key) => (
        <NotificationRow
          key={key}
          item={notifications[key]}
          time={notificationTimes[key]}
          onRespond={args.onRespond}
        />
      ))}
    </ul>
  ),
};

export const Mobile: Story = {
  ...List,
  globals: { viewport: { value: 'mobile' } },
};
