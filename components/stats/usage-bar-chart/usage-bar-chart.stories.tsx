import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  emptyMonthlyUsage,
  materialMonthlyUsage,
  monthlyUsage,
  newUserMonthlyUsage,
} from '@/stories/fixtures/usage';
import { UsageBarChart, type UsageMetric } from './usage-bar-chart';

const meta = {
  title: 'Design/UsageBarChart',
  component: UsageBarChart,
  args: { data: monthlyUsage },
  decorators: [
    (Story) => (
      <div className="max-w-[880px] pt-12">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UsageBarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Statistics board, section 01: 12 months, axis 0.5 / 1.0 / 1.5 kg. */
export const Default: Story = {};

export const Cost: Story = { args: { metric: 'cost' } };

/** The Grams/Cost seg drives `metric`; the toggle lives with the section head. */
export const WithMetricToggle: Story = {
  render: function Render(args) {
    const [metric, setMetric] = React.useState<UsageMetric>('grams');
    return (
      <div className="flex flex-col gap-6">
        <ToggleGroup
          aria-label="Unit"
          value={[metric]}
          onValueChange={(v) => setMetric(v[0] as UsageMetric)}
          className="self-end"
        >
          <ToggleGroupItem value="grams">Grams</ToggleGroupItem>
          <ToggleGroupItem value="cost">Cost</ToggleGroupItem>
        </ToggleGroup>
        <UsageBarChart {...args} metric={metric} />
      </div>
    );
  },
};

/** Overview board, section 03: shorter, peak value on its column. */
export const Compact: Story = { args: { variant: 'compact' } };

/** Material detail board, section 02: one material, single-letter months. */
export const MaterialDetail: Story = {
  args: {
    data: materialMonthlyUsage,
    variant: 'compact',
    monthLabels: 'narrow',
  },
};

/** Tracking started recently: leading empty months, grams below 1 kg. */
export const RecentlyStarted: Story = { args: { data: newUserMonthlyUsage } };

export const NoPrices: Story = { args: { showCost: false } };

export const Empty: Story = { args: { data: emptyMonthlyUsage } };

export const Mobile: Story = {
  args: { variant: 'compact', monthLabels: 'narrow' },
  globals: { viewport: { value: 'mobile' } },
};
