import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { materialGroupStock } from '@/stories/fixtures/material-detail';
import { ME } from '@/stories/fixtures/social';

import { MaterialGroupStockTable } from './material-group-stock-table';

const meta = {
  title: 'Design/MaterialGroupStockTable',
  component: MaterialGroupStockTable,
  args: {
    rows: materialGroupStock,
    currentUserId: ME.id,
    onRequest: fn(),
    onCancelRequest: fn(),
  },
} satisfies Meta<typeof MaterialGroupStockTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** MaterialDetail board, 04 In your groups. */
export const Default: Story = {};

export const Requesting: Story = {
  args: { pendingKey: `group-farm:${materialGroupStock[0].spool.id}` },
};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
