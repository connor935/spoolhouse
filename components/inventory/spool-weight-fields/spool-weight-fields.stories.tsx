import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SpoolWeightFields } from './spool-weight-fields';

const meta = {
  title: 'Design/SpoolWeightFields',
  component: SpoolWeightFields,
  args: {
    fullGrams: '1000',
    measuredGrams: '1193',
    emptyWeightGrams: 193,
    prefilled: true,
    onFullGramsChange: fn(),
    onMeasuredGramsChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="bg-card w-[512px] max-w-full p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SpoolWeightFields>;

export default meta;
type Story = StoryObj<typeof meta>;

/** SpoolAdd board: a fresh 1 kg spool, total prefilled. */
export const Add: Story = {};

/** No spool type picked yet: nothing to subtract. */
export const NoSpoolType: Story = { args: { emptyWeightGrams: null } };

/** SpoolEdit board: 935 g total − 193 g empty spool = 742 g. */
export const Edit: Story = {
  args: { measuredGrams: '935', prefilled: false, editing: true },
};

export const Unreadable: Story = {
  args: { measuredGrams: 'abc', prefilled: false },
};

export const Mobile: Story = {
  args: { measuredGrams: '1316', fullGrams: '1100', emptyWeightGrams: 216 },
  globals: { viewport: { value: 'mobile' } },
};
