import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Inset } from './inset';

const meta = {
  title: 'Design/Inset',
  component: Inset,
  args: {
    children: (
      <>
        <span className="kicker">Details · optional</span>
        <Field>
          <FieldLabel htmlFor="inset-location">Location</FieldLabel>
          <Input id="inset-location" placeholder="Shelf B, AMS 2" />
        </Field>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[480px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Inset>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
