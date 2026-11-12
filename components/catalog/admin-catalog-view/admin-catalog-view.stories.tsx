import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { fn } from 'storybook/test';

import { materialRows } from '../admin-catalog-table/admin-catalog-table.stories';
import { AdminCatalogView, type AdminStatusFilter } from './admin-catalog-view';

const statusCounts = { approved: 23864, pending: 3, rejected: 1 };

const meta = {
  title: 'Catalog/AdminCatalogView',
  component: AdminCatalogView,
  parameters: { layout: 'padded' },
  args: {
    title: 'Manage materials',
    description: 'Approve or reject submissions, edit or delete any entry.',
    entityLabel: 'Material',
    detailLabel: 'Type',
    rows: materialRows,
    matching: 23868,
    statusCounts,
    status: 'all',
    onStatusChange: fn(),
    query: '',
    onQueryChange: fn(),
    onClear: fn(),
    reviewHref: '/admin/materials/review',
    onApprove: fn(),
    onReject: fn(),
    onEdit: fn(),
    onDelete: fn(),
    onLoadMore: fn(),
  },
  render: function Render(args) {
    const [status, setStatus] = React.useState<AdminStatusFilter>(args.status);
    const rows =
      status === 'all'
        ? args.rows
        : args.rows.filter((r) => r.status === status);
    return (
      <AdminCatalogView
        {...args}
        rows={rows}
        matching={status === 'all' ? args.matching : rows.length}
        status={status}
        onStatusChange={(next) => {
          setStatus(next);
          args.onStatusChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof AdminCatalogView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PendingOnly: Story = { args: { status: 'pending' } };

export const NothingToReview: Story = {
  args: {
    rows: materialRows.filter((r) => r.status === 'approved'),
    statusCounts: { approved: 23864, pending: 0, rejected: 0 },
  },
};

export const NoResults: Story = {
  args: { rows: [], matching: 0, query: 'unobtainium' },
};

export const Dark: Story = { globals: { theme: 'dark' } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
