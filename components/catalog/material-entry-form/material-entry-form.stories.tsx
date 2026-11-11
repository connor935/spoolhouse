import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { MaterialEntryForm } from './material-entry-form';

const meta = {
  title: 'Design/MaterialEntryForm',
  component: MaterialEntryForm,
  args: {
    mode: 'request',
    autoApprove: false,
    recentColors: ['#1F1F1F', '#F2F2EE', '#F26B21', '#0086D6'],
    onSubmit: fn(),
    onCancel: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[540px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MaterialEntryForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** RequestForms board, member request: "Mint" by Extrudr. */
export const Request: Story = {
  args: {
    defaultValues: {
      manufacturer: 'Extrudr',
      name: 'Mint',
      filamentType: 'PLA',
      color: '#9ADBC0',
    },
  },
};

export const Empty: Story = {};

export const AdminAdd: Story = { args: { autoApprove: true } };

/** Own rejected entry: edit = resubmit. */
export const EditRejected: Story = {
  args: {
    mode: 'edit',
    status: 'rejected',
    defaultValues: {
      manufacturer: 'Sunlu',
      name: 'Silk Rainbow Multicolor',
      filamentType: 'PLA',
      color: '#E85D75',
    },
  },
};

export const EditAsAdmin: Story = {
  args: { ...EditRejected.args, isAdmin: true, status: 'approved' },
};

export const Dark: Story = { ...Request, globals: { theme: 'dark' } };

export const Mobile: Story = {
  ...Request,
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
