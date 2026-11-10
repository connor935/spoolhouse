import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from '../input';
import { Label } from './label';

const meta = {
  title: 'UI/Label',
  component: Label,
  args: { children: 'Display name', htmlFor: 'display-name' },
  render: (args) => (
    <div className="flex w-72 flex-col gap-1.5">
      <Label {...args} />
      <Input id="display-name" variant="ink" defaultValue="Anna Weber" />
    </div>
  ),
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
