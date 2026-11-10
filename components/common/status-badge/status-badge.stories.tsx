import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StatusBadge, type CatalogStatus } from './status-badge';

const STATUSES: CatalogStatus[] = [
  'approved',
  'pending',
  'rejected',
  'imported',
  'unverified',
];

const meta = {
  title: 'Design/StatusBadge',
  component: StatusBadge,
  args: { status: 'pending' },
  argTypes: { status: { control: 'select', options: STATUSES } },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {STATUSES.map((status) => (
        <StatusBadge key={status} status={status} />
      ))}
    </div>
  ),
};

/** Short label where space is tight (catalog rows). */
export const CustomLabel: Story = {
  args: { status: 'imported', children: 'Imported' },
};
