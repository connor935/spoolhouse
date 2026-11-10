import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '../button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

type Args = { onConfirm: () => void; defaultOpen?: boolean };

const meta = {
  title: 'UI/Dialog',
  args: { onConfirm: fn() },
  render: ({ onConfirm, defaultOpen }) => (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        Delete spool
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this spool?</DialogTitle>
          <DialogDescription>This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <DialogClose
            render={<Button variant="destructive" />}
            onClick={onConfirm}
          >
            Delete spool
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = { args: { defaultOpen: true } };
