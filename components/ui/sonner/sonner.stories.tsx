import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { toast } from 'sonner';
import { Button } from '../button';
import { Toaster } from './sonner';

const meta = {
  title: 'UI/Toaster',
  component: Toaster,
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Copy taken from the Patterns board, section 03. */
export const Default: Story = {
  render: (args) => (
    <>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => toast.success('Weight restored to 935 g total')}
        >
          Show success
        </Button>
        <Button
          variant="outline"
          onClick={() => toast('Resubmitted for review')}
        >
          Show message
        </Button>
        <Button
          variant="destructive-outline"
          onClick={() =>
            toast.error(
              "Measured weight can't be less than the empty spool weight"
            )
          }
        >
          Show error
        </Button>
      </div>
      <Toaster {...args} />
    </>
  ),
};

/** Mobile drops toasts in from the top centre. */
export const Mobile: Story = {
  ...Default,
  globals: { viewport: { value: 'mobile', isRotated: false } },
};
