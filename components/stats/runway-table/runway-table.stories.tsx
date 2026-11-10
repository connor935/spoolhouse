import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { byMaterial, byType } from '@/stories/fixtures/usage';
import { RunwayTable } from './runway-table';

const meta = {
  title: 'Design/RunwayTable',
  component: RunwayTable,
  args: { rows: byMaterial },
  decorators: [
    (Story) => (
      <div className="max-w-[760px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RunwayTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Statistics board, section 02 ("Runs out first ↑"). */
export const ByMaterial: Story = {};

/** Input order doesn't matter: the table sorts by runway itself. */
export const Unsorted: Story = { args: { rows: [...byMaterial].reverse() } };

/** Statistics board, section 03, under the stock composition bar. */
export const ByType: Story = {
  args: { rows: byType, kind: 'type' },
  decorators: [
    (Story) => (
      <div className="max-w-[420px]">
        <Story />
      </div>
    ),
  ],
};

export const OutOfStock: Story = {
  args: {
    rows: [
      ...byMaterial.slice(0, 2),
      {
        key: 'empty',
        label: 'Matte Charcoal',
        color: '#3A3D42',
        filamentType: 'PLA',
        usedLast90Grams: 900,
        leftGrams: 0,
        forecastDays: 0,
      },
    ],
  },
};

export const Empty: Story = { args: { rows: [] } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};
