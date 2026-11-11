import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { SpoolWeightFields } from '../spool-weight-fields';
import { SpoolFormFrame } from './spool-form-frame';

const body = (
  <SpoolWeightFields
    fullGrams="1000"
    measuredGrams="1193"
    emptyWeightGrams={193}
    prefilled
    onFullGramsChange={() => {}}
    onMeasuredGramsChange={() => {}}
  />
);

const meta = {
  title: 'Design/SpoolFormFrame',
  component: SpoolFormFrame,
  args: {
    open: true,
    mode: 'add',
    kicker: '02 — Inventory / New spool',
    onOpenChange: fn(),
    onSubmit: fn(),
    children: body,
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SpoolFormFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

/** SpoolAdd board. */
export const Add: Story = {};

/** SpoolAdd board's footer error. */
export const WithError: Story = {
  args: { error: 'Pick a spool type (or request a new one)' },
};

/** SpoolEdit board: Delete spool on the left of the footer. */
export const Edit: Story = {
  args: { mode: 'edit', kicker: 'Galaxy Black / #01', onDelete: fn() },
};

export const Saving: Story = { args: { saving: true } };

/** SpoolSheetMobile board. */
export const MobileSheet: Story = {
  args: { variant: 'sheet' },
  globals: { viewport: { value: 'mobile' } },
};
