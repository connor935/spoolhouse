import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { SpoolTypeEntryForm } from '@/components/catalog/spool-type-entry-form';
import { spoolTypeGroups } from '@/stories/fixtures/catalog';

import { SpoolTypeCatalogView } from './spool-type-catalog-view';

const rows = spoolTypeGroups.flatMap((g) =>
  g.entries.map((e) => ({ ...e.spoolType, spoolCount: e.inUseCount }))
);

const meta = {
  title: 'Pages/SpoolTypeCatalog',
  component: SpoolTypeCatalogView,
  parameters: { layout: 'padded' },
  args: {
    spoolTypes: rows,
    viewerId: 'user-viewer',
    query: '',
    onQueryChange: fn(),
    onEdit: fn(),
    autoApprove: false,
    requestOpen: false,
    onRequestOpenChange: fn(),
    requestForm: (
      <SpoolTypeEntryForm mode="request" autoApprove={false} onSubmit={fn()} />
    ),
  },
} satisfies Meta<typeof SpoolTypeCatalogView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** CatalogSpoolTypes board. */
export const Default: Story = {};

export const Searched: Story = { args: { query: 'prusament 2' } };

export const RequestOpen: Story = { args: { requestOpen: true } };

export const Dark: Story = { globals: { theme: 'dark' } };

export const Mobile: Story = {
  args: { compact: true },
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
