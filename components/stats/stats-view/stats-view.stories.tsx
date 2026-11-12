import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  byMaterial,
  byType,
  emptyMonthlyUsage,
  monthlyUsage,
  stockByType,
} from '@/stories/fixtures/usage';
import { StatsView } from './stats-view';

const meta = {
  title: 'Pages/Statistics',
  component: StatsView,
  parameters: { layout: 'padded' },
  args: {
    delta: { last30Grams: 1180, prev30Grams: 1341, deltaPct: -12 },
    costLast30Cents: 2740,
    avgPerMonthGrams: 1069,
    stockValueCents: 21460,
    pricedSpools: 11,
    stockedSpools: 14,
    monthly: monthlyUsage,
    byMaterial,
    byType,
    stockByType,
  },
} satisfies Meta<typeof StatsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile' } },
};

/** No weighings yet: readouts at zero, the chart becomes an empty state. */
export const NoUsage: Story = {
  args: {
    delta: { last30Grams: 0, prev30Grams: 0, deltaPct: null },
    costLast30Cents: 0,
    avgPerMonthGrams: 0,
    stockValueCents: 0,
    pricedSpools: 0,
    stockedSpools: 2,
    monthly: emptyMonthlyUsage,
    byMaterial: byMaterial
      .slice(-2)
      .map((r) => ({ ...r, usedLast90Grams: 0, forecastDays: null })),
    byType: [],
  },
};
