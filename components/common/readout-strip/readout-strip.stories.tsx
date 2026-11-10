import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { formatMoney, formatWeight } from '@/lib/filament';
import { Readout, ReadoutStrip, readoutParts } from './readout-strip';

const meta = {
  title: 'Design/ReadoutStrip',
  component: ReadoutStrip,
  args: { children: null },
} satisfies Meta<typeof ReadoutStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Statistics: big numbers, units and decimals split off by `readoutParts`. */
export const Default: Story = {
  render: (args) => (
    <ReadoutStrip {...args}>
      <Readout
        size="big"
        label="Used · 30 days"
        {...readoutParts(formatWeight(1180))}
        sub="−12 % vs. prev. 30 days"
        tone="positive"
      />
      <Readout
        size="big"
        label="Average / month"
        {...readoutParts(formatWeight(1070))}
        sub="last 12 months"
      />
      <Readout
        size="big"
        label="Cost · 30 days"
        {...readoutParts(formatMoney(2740))}
        sub="priced spools only"
      />
      <Readout
        size="big"
        label="Stock value"
        {...readoutParts(formatMoney(21460))}
        sub="11/14 priced"
      />
    </ReadoutStrip>
  ),
};

/** Default size (40px) as on the material detail page. */
export const Compact: Story = {
  render: (args) => (
    <ReadoutStrip {...args}>
      <Readout label="In stock" {...readoutParts(formatWeight(2160))} sub="3 spools" />
      <Readout label="Used · 12 months" {...readoutParts(formatWeight(3400))} />
      <Readout label="Runway" value="~7" unit="wk" sub="at 310 g / week" />
    </ReadoutStrip>
  ),
};

/** Overview readouts are links to their page; hover tints the cell. */
export const AsLinks: Story = {
  render: (args) => (
    <ReadoutStrip {...args} ruled>
      <Readout
        href="/inventory"
        size="big"
        label="Spools in stock"
        value="14"
        unit="/ 19"
        sub="5 empty"
      />
      <Readout
        href="/inventory"
        size="big"
        label="Filament left"
        {...readoutParts(formatWeight(8090))}
        sub="8 materials · 3 types"
      />
    </ReadoutStrip>
  ),
};

/** Sub-line tones for deltas. */
export const Tones: Story = {
  render: (args) => (
    <ReadoutStrip {...args}>
      <Readout label="Default" value="1.18" unit="kg" sub="−12 % vs. prev." />
      <Readout label="Positive" value="1.18" unit="kg" sub="−12 % vs. prev." tone="positive" />
      <Readout label="Negative" value="1.42" unit="kg" sub="+18 % vs. prev." tone="negative" />
    </ReadoutStrip>
  ),
};

/** Cells wrap to one per row at 390px; separators stay on the left edge. */
export const Mobile: Story = {
  ...Default,
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
