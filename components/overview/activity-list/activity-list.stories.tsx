import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ActivityList, type ActivityEntry } from './activity-list';

// Main board, section 04 "Recent activity".
const items: ActivityEntry[] = [
  {
    id: '1',
    time: '14:02',
    kind: 'weigh',
    content: (
      <>
        Weighed <strong>Galaxy Black #1</strong> —{' '}
        <span className="font-mono">742 g</span>{' '}
        <span className="text-muted-foreground font-mono">(−58)</span>
      </>
    ),
  },
  {
    id: '2',
    time: '11:40',
    kind: 'request',
    unread: true,
    content: (
      <>
        <strong>Anna Weber</strong> requested <strong>Prusa Orange #3</strong>
      </>
    ),
  },
  {
    id: '3',
    time: 'Yday',
    kind: 'borrow',
    content: (
      <>
        <strong>Mia Koch</strong> approved your request for{' '}
        <strong>Basic Cyan #4</strong>
      </>
    ),
  },
  {
    id: '4',
    time: '07 Nov',
    kind: 'weigh',
    content: (
      <>
        Weighed <strong>Prusa Orange #2</strong> —{' '}
        <span className="font-mono">86 g</span>{' '}
        <span className="text-muted-foreground font-mono">(−41)</span>
      </>
    ),
  },
];

const meta = {
  title: 'Design/ActivityList',
  component: ActivityList,
  args: { items },
  decorators: [
    (Story) => (
      <div className="max-w-[560px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActivityList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { items: [] } };

export const Mobile: Story = { globals: { viewport: { value: 'mobile' } } };
