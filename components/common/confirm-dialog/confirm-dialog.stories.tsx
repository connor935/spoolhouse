import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { ConfirmDialog } from './confirm-dialog';

const meta = {
  title: 'Design/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    open: true,
    options: {
      title: 'Leave “Makerspace Nord”?',
      description: 'Your shared spools disappear from the group stock.',
    },
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Irreversible action: red confirm button, custom labels. */
export const Destructive: Story = {
  args: {
    options: {
      title: 'Delete this spool?',
      description: 'Its weighing history is deleted with it.',
      confirmLabel: 'Delete spool',
      cancelLabel: 'Keep',
      destructive: true,
    },
  },
};

/** Title only — the description is optional. */
export const TitleOnly: Story = {
  args: { options: { title: 'Mark as returned?' } },
};
