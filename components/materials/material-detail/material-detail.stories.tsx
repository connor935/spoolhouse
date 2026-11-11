import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { galaxyBlackPla, materials } from '@/stories/fixtures/inventory';
import {
  galaxyBlackSummary,
  materialGroupStock,
  materialUsage,
  noUsage,
  propertyDefinitions,
  propertyValues,
} from '@/stories/fixtures/material-detail';
import { ME } from '@/stories/fixtures/social';
import { materialStockSummary } from '@/lib/filament';

import { MaterialDetail } from './material-detail';

const galaxyBlack = { ...materials.galaxyBlack, color: '#1F1F1F' };

const meta = {
  title: 'Pages/MaterialDetail',
  component: MaterialDetail,
  parameters: { layout: 'padded' },
  args: {
    material: galaxyBlack,
    breadcrumb: [{ label: 'Inventory', href: '/inventory' }],
    isAdmin: false,
    own: false,
    spoolCount: 3,
    spools: galaxyBlackPla.spools,
    summary: galaxyBlackSummary,
    usage: materialUsage,
    properties: {
      values: propertyValues,
      definitions: propertyDefinitions,
      isAdmin: false,
      onSave: fn(() => true),
    },
    groupStock: {
      rows: materialGroupStock,
      currentUserId: ME.id,
      onRequest: fn(),
      onCancelRequest: fn(),
    },
    onSelectSpool: fn(),
    onEditSpool: fn(),
    onMarkDried: fn(),
    onAddSpool: fn(),
    onEdit: fn(),
    onApprove: fn(),
    onReject: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof MaterialDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

/** MaterialDetail board as a member: approved material, no review actions. */
export const Member: Story = {};

/** Admin on an imported, approved material in use: Delete is disabled. */
export const Admin: Story = {
  args: {
    isAdmin: true,
    material: { ...galaxyBlack, externalKey: 'spoolmandb:prusament:pla:black' },
    properties: {
      values: propertyValues,
      definitions: propertyDefinitions,
      isAdmin: true,
      onSave: fn(() => true),
      onVerify: fn(),
      onDelete: fn(),
    },
  },
};

/** Admin on a pending entry nobody uses yet: Approve, Reject, Delete. */
export const AdminPending: Story = {
  args: {
    isAdmin: true,
    material: { ...galaxyBlack, status: 'pending' },
    spoolCount: 0,
    spools: [],
    summary: materialStockSummary([]),
    usage: noUsage,
    groupStock: { rows: [], currentUserId: ME.id },
  },
};

/** The submitter's rejected entry: Edit resubmits. */
export const OwnRejected: Story = {
  args: {
    own: true,
    material: { ...galaxyBlack, status: 'rejected', submittedById: ME.id },
  },
};

export const Dark: Story = { globals: { theme: 'dark' } };

/** MaterialDetailMobile board. */
export const Mobile: Story = {
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
