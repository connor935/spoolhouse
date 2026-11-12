import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NotFoundView } from './not-found-view';

const meta = {
  title: 'Pages/NotFound',
  component: NotFoundView,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof NotFoundView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
