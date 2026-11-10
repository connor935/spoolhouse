import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { stockByType } from '@/stories/fixtures/usage';
import { StockCompositionBar } from './stock-composition-bar';

const meta = {
  title: 'Design/StockCompositionBar',
  component: StockCompositionBar,
  args: { data: stockByType },
  decorators: [
    (Story) => (
      <div className="max-w-[420px] pt-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StockCompositionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Statistics board, section 03: PLA 74 % / PETG 16 % / ASA 10 %, 8.09 kg. */
export const Default: Story = {};

/** Equal thirds: rounding still sums to 100 (34 / 33 / 33). */
export const EvenSplit: Story = {
  args: {
    data: [
      { type: 'PLA', grams: 1000 },
      { type: 'PETG', grams: 1000 },
      { type: 'ASA', grams: 1000 },
    ],
  },
};

/** More types than fills: the smallest fold into "Other". */
export const ManyTypes: Story = {
  args: {
    data: [
      { type: 'PLA', grams: 4200 },
      { type: 'PETG', grams: 2100 },
      { type: 'ASA', grams: 900 },
      { type: 'TPU', grams: 400 },
      { type: 'Nylon', grams: 250 },
      { type: 'PC', grams: 120 },
    ],
  },
};

export const SingleType: Story = {
  args: { data: [{ type: 'PLA', grams: 3150 }] },
};

export const Empty: Story = { args: { data: [] } };
