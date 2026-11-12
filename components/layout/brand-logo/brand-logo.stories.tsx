import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { BrandLogo } from './brand-logo';

const meta = {
  title: 'Shell/BrandLogo',
  component: BrandLogo,
} satisfies Meta<typeof BrandLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Collapsed rail: mark only. */
export const MarkOnly: Story = { args: { withName: false } };

export const Dark: Story = { globals: { theme: 'dark' } };
