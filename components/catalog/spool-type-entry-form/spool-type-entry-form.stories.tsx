import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { SpoolTypeEntryForm } from './spool-type-entry-form';

const meta = {
  title: 'Design/SpoolTypeEntryForm',
  component: SpoolTypeEntryForm,
  args: { mode: 'request', autoApprove: false, onSubmit: fn(), onCancel: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-[460px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SpoolTypeEntryForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Request: Story = {};

/** RequestForms board: admin adds, straight into the catalog. */
export const AdminAdd: Story = {
  args: {
    autoApprove: true,
    defaultValues: { manufacturer: 'Extrudr', name: 'Cardboard 1.1 kg' },
  },
};

export const EditRejected: Story = {
  args: {
    mode: 'edit',
    status: 'rejected',
    defaultValues: {
      manufacturer: 'Prusament',
      name: 'Cardboard 2 kg',
      emptyWeightGrams: 330,
    },
  },
};

export const Dark: Story = { globals: { theme: 'dark' } };

export const Mobile: Story = {
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
