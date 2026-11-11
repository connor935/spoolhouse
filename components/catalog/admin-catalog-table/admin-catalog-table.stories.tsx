import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { formatWeight } from '@/lib/filament';
import { adminMaterialRows, spoolTypeGroups } from '@/stories/fixtures/catalog';

import {
  AdminCatalogTable,
  type AdminCatalogTableRow,
} from './admin-catalog-table';

export const materialRows: AdminCatalogTableRow[] = adminMaterialRows.map(
  ({ material: m, submittedBy, submittedAgo, spoolCount }) => ({
    id: m.id,
    manufacturer: m.manufacturer,
    name: m.name,
    color: m.color,
    detail: m.filamentType,
    status: m.status,
    submittedBy,
    submittedAgo,
    spoolCount,
    href: `/materials/${m.id}?from=admin`,
  })
);

const spoolTypeRows: AdminCatalogTableRow[] = spoolTypeGroups
  .flatMap((g) => g.entries)
  .map(({ spoolType: t, inUseCount }, i) => ({
    id: t.id,
    manufacturer: t.manufacturer,
    name: t.name,
    detail: formatWeight(t.emptyWeightGrams),
    status: t.status,
    submittedBy: t.submittedById ? 'Anna Weber' : null,
    submittedAgo: `${i + 1} d ago`,
    spoolCount: inUseCount,
  }))
  .sort(
    (a, b) => Number(b.status === 'pending') - Number(a.status === 'pending')
  );

const meta = {
  title: 'Catalog/AdminCatalogTable',
  component: AdminCatalogTable,
  args: {
    entityLabel: 'Material',
    detailLabel: 'Type',
    rows: materialRows,
    onApprove: fn(),
    onReject: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[1040px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminCatalogTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Materials: Story = {};

export const SpoolTypes: Story = {
  args: {
    entityLabel: 'Spool type',
    detailLabel: 'Empty spool',
    rows: spoolTypeRows,
  },
};

export const Busy: Story = { args: { busyId: materialRows[0].id } };

export const Dark: Story = { globals: { theme: 'dark' } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
