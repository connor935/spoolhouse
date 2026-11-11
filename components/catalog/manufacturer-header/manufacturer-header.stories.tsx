import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ManufacturerHeader } from './manufacturer-header';

const meta = {
  title: 'Design/ManufacturerHeader',
  component: ManufacturerHeader,
  args: { name: 'Prusament', count: 96 },
  decorators: [
    (Story) => (
      <div className="max-w-[880px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ManufacturerHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Counts are grouped with commas, as on the catalog toolbar. */
export const LargeCount: Story = { args: { name: 'Bambu Lab', count: 2140 } };

export const WithoutCount: Story = { args: { count: undefined } };

/** CatalogMobile board. */
export const Compact: Story = {
  args: { compact: true },
  globals: { viewport: { value: 'mobile' } },
};
