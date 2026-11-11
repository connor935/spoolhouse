import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { MaterialEntryForm } from '@/components/catalog/material-entry-form';
import { EMPTY_FILTER_VALUE, type FilterValue } from '@/lib/filter-value';
import {
  catalogCounts,
  filterProperties,
  materialGroups,
} from '@/stories/fixtures/catalog';

import { MaterialCatalogView } from './material-catalog-view';

const boardFilter: FilterValue = {
  ...EMPTY_FILTER_VALUE,
  propertyConstraints: [
    { id: 'prop-density', propertyId: 'prop-density', min: 1.2, max: 1.3 },
  ],
};

const meta = {
  title: 'Pages/MaterialCatalog',
  component: MaterialCatalogView,
  parameters: { layout: 'padded' },
  args: {
    groups: materialGroups,
    matching: catalogCounts.matching,
    total: catalogCounts.total,
    query: 'pla',
    onQueryChange: fn(),
    filter: boardFilter,
    onFilterChange: fn(),
    properties: filterProperties,
    onClear: fn(),
    onLoadMore: fn(),
    autoApprove: false,
    requestOpen: false,
    onRequestOpenChange: fn(),
    requestForm: (
      <MaterialEntryForm mode="request" autoApprove={false} onSubmit={fn()} />
    ),
  },
} satisfies Meta<typeof MaterialCatalogView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** CatalogMaterials board: search "pla", density filter, three groups. */
export const Default: Story = {};

/** Side panel open (RequestForms board, member request). */
export const RequestOpen: Story = { args: { requestOpen: true } };

export const Admin: Story = { args: { autoApprove: true } };

export const NoResults: Story = {
  args: { groups: [], matching: 0, query: 'unobtainium' },
};

/** Everything matching fits on the page: no Load more. */
export const AllShown: Story = { args: { matching: 9 } };

export const Dark: Story = { globals: { theme: 'dark' } };

/** CatalogMobile board. */
export const Mobile: Story = {
  args: { compact: true },
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
