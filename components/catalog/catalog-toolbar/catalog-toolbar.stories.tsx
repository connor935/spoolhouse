import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { CatalogToolbar } from './catalog-toolbar';

const meta = {
  title: 'Design/CatalogToolbar',
  component: CatalogToolbar,
  args: {
    query: 'pla',
    onQueryChange: fn(),
    searchLabel: 'Search materials',
    placeholder: 'Search manufacturer, material or color…',
    filterCount: 1,
    onFiltersClick: fn(),
    onClear: fn(),
    matching: 1204,
    total: 23871,
  },
} satisfies Meta<typeof CatalogToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Busy: Story = { args: { busy: true } };

/** Spool types: search only. */
export const SearchOnly: Story = {
  args: {
    query: '',
    filterCount: 0,
    onFiltersClick: undefined,
    searchLabel: 'Search spool types',
    matching: 48,
    total: 1312,
  },
};

export const Mobile: Story = {
  args: { compact: true },
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
