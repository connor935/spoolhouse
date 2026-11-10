import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { lendSpools } from '@/stories/fixtures/social';

import { LendSpoolLabel } from './lend-spool-label';

const meta = {
  title: 'Design/LendSpoolLabel',
  component: LendSpoolLabel,
  args: { spool: lendSpools.prusaOrange3 },
} satisfies Meta<typeof LendSpoolLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Notifications only know the material, not the spool's number. */
export const WithoutNumber: Story = {
  args: { spool: { materialName: 'Silk Gold', color: '#C9A23F' } },
};

export const NoSwatch: Story = { args: { swatch: false } };
