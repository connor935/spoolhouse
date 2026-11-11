import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import {
  adminMaterialRows,
  duplicateCandidates,
  reviewEntry,
} from '@/stories/fixtures/catalog';

import { ReviewQueue } from './review-queue';

const upNext = adminMaterialRows
  .filter((r) => r.material.status === 'pending')
  .slice(1)
  .map(({ material: m, submittedAgo }) => ({
    id: m.id,
    manufacturer: m.manufacturer,
    name: m.name,
    color: m.color,
    tag: m.filamentType,
    submittedAgo,
  }));

const meta = {
  title: 'Catalog/ReviewQueue',
  component: ReviewQueue,
  parameters: { layout: 'padded' },
  args: {
    title: 'Review queue',
    breadcrumb: [
      { label: 'Admin' },
      { label: 'Materials', href: '/admin/materials' },
      { label: 'Review' },
    ],
    noun: 'material',
    pendingCount: 7,
    position: 0,
    summary: {
      entry: {
        ...reviewEntry.material,
        tag: reviewEntry.material.filamentType,
      },
      manufacturerEntryCount: 142,
      submitter: { name: 'Anna Weber', trusted: false },
      submittedAgo: '2 h ago',
      spoolCount: 1,
      spoolOwners: ['Anna Weber'],
    },
    duplicates: duplicateCandidates.map((c) => ({
      ...c,
      id: c.entry.id,
      href: `/materials/${c.entry.id}?from=review`,
    })),
    upNext,
    skipHref: '/admin/materials/review?skip=1',
    backHref: '/admin/materials',
    onApprove: fn(),
    onReject: fn(),
    onEdit: fn(),
  },
} satisfies Meta<typeof ReviewQueue>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoDuplicates: Story = { args: { duplicates: [] } };

export const LastOne: Story = {
  args: { pendingCount: 1, upNext: [], skipHref: null },
};

export const Empty: Story = {
  args: { pendingCount: 0, summary: undefined, duplicates: [], upNext: [] },
};

export const SpoolType: Story = {
  args: {
    noun: 'spool type',
    breadcrumb: [
      { label: 'Admin' },
      { label: 'Spool types', href: '/admin/spool-types' },
      { label: 'Review' },
    ],
    pendingCount: 2,
    summary: {
      entry: {
        manufacturer: 'Polymaker',
        name: 'Cardboard 3 kg',
        status: 'pending',
        tag: '520 g',
      },
      noun: 'spool type',
      tagLabel: 'Empty spool',
      manufacturerEntryCount: 3,
      submitter: { name: 'Jonas Becker', trusted: true },
      submittedAgo: '1 d ago',
      spoolCount: 0,
    },
    duplicates: [
      {
        id: 'st-polymaker-3-approved',
        entry: {
          manufacturer: 'Polymaker',
          name: 'Cardboard 3kg',
          status: 'approved',
          detail: '518 g',
        },
        reason: 'same-name',
        spoolCount: 2,
      },
    ],
    upNext: [
      {
        id: 'st-next',
        manufacturer: 'Extrudr',
        name: 'Cardboard 2.5 kg',
        tag: '410 g',
        submittedAgo: '3 d ago',
      },
    ],
    skipHref: '/admin/spool-types/review?skip=1',
  },
};

export const Busy: Story = { args: { busy: true } };

export const Dark: Story = { globals: { theme: 'dark' } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
