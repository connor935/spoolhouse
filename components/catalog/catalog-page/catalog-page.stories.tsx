import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { fn } from 'storybook/test';

import { CatalogPage } from './catalog-page';

const meta = {
  title: 'Catalog/CatalogPage',
  component: CatalogPage,
  parameters: { layout: 'padded' },
  args: {
    index: '06',
    title: 'Materials',
    totalEntries: 23871,
    description: 'Every filament line and colour, shared by all users.',
    requestLabel: 'Request material',
    requestOpen: false,
    onRequestOpenChange: fn(),
    requestTitle: 'Request a new material',
    requestForm: <p className="p-6">The request form goes here.</p>,
    children: <p className="text-muted-foreground">Toolbar and list.</p>,
  },
  render: function Render(args) {
    const [open, setOpen] = React.useState(args.requestOpen);
    return (
      <CatalogPage
        {...args}
        requestOpen={open}
        onRequestOpenChange={(next) => {
          setOpen(next);
          args.onRequestOpenChange(next);
        }}
      />
    );
  },
} satisfies Meta<typeof CatalogPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const RequestOpen: Story = { args: { requestOpen: true } };

export const Mobile: Story = {
  args: { compact: true },
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
