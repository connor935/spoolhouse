import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ActivityItem } from './activity-item';

const meta = {
  title: 'Design/ActivityItem',
  component: ActivityItem,
  args: {
    time: '14:02',
    dateTime: '2026-11-10T14:02:00Z',
    kind: 'weigh',
    children: (
      <>
        Weighed <strong>Galaxy Black #1</strong> —{' '}
        <span className="font-mono">742 g</span>{' '}
        <span className="text-muted-foreground font-mono">(−58)</span>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <ul className="max-w-[560px]">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof ActivityItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Weigh: Story = {};

/** Unread: accent time with a dot. */
export const UnreadRequest: Story = {
  args: {
    time: '11:40',
    kind: 'request',
    unread: true,
    children: (
      <>
        <strong>Anna Weber</strong> requested <strong>Prusa Orange #3</strong>
      </>
    ),
  },
};

export const Borrow: Story = {
  args: {
    time: 'Yday',
    kind: 'borrow',
    children: (
      <>
        <strong>Mia Koch</strong> approved your request for{' '}
        <strong>Basic Cyan #4</strong>
      </>
    ),
  },
};

/** Long text wraps in its column; time and tag stay aligned. */
export const LongText: Story = {
  args: {
    time: '07 Nov',
    kind: 'borrow',
    children: (
      <>
        <strong>Jonas Schmidt-Hoffmann</strong> returned{' '}
        <strong>Fire Engine Red PETG #12</strong> to the shared shelf in the
        print farm after three weeks
      </>
    ),
  },
  globals: { viewport: { value: 'mobile' } },
};
