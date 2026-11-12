import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '../button';
import {
  Dialog,
  DialogBody,
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
      <DialogTrigger render={<Button variant="outline" />}>
        Edit spool type
      </DialogTrigger>
      <DialogContent>
        <DialogHeader kicker="Catalog · pending review">
          <DialogTitle>Edit spool type</DialogTitle>
          <DialogDescription>
            Your request is still pending; changes apply immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p>Form fields go here.</p>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <DialogClose render={<Button />} onClick={onConfirm}>
            Save changes
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

/** Patterns 02: short confirm — no header rule, no close button. */
export const DestructiveConfirm: Story = {
  args: { defaultOpen: true },
  render: ({ onConfirm, defaultOpen }) => (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        Delete spool
      </DialogTrigger>
      <DialogContent className="sm:max-w-[360px]" showCloseButton={false}>
        <DialogHeader variant="plain">
          <DialogTitle>Delete this spool?</DialogTitle>
          <DialogDescription>This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="sm" />}>
            Cancel
          </DialogClose>
          <DialogClose
            render={<Button variant="destructive" size="sm" />}
            onClick={onConfirm}
          >
            Delete spool
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/** BorrowDialog.dc.html layout with static content. */
export const BorrowRequest: Story = {
  args: { defaultOpen: true },
  render: ({ onConfirm, defaultOpen }) => (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        Open request
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader kicker="Print Farm Friends · just now">
          <DialogTitle className="text-[30px]">Borrow request</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p>
            <strong className="font-semibold">Anna Weber</strong> wants to
            borrow one of your spools.
          </p>
          <div className="border-ink flex items-center gap-3.5 rounded-[4px] border p-3.5">
            <span
              aria-hidden
              className="bg-accent ring-swatch-ring size-[34px] shrink-0 rounded-full ring-1"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-xs">
                  #03
                </span>
                <span className="display-name text-xl">Prusa Orange</span>
                <span className="border-ink rounded-[3px] border px-1 font-mono text-[10.5px] font-semibold uppercase">
                  PETG
                </span>
              </span>
              <span className="bg-muted h-1.5 w-full rounded-full">
                <span className="bg-data block h-full w-2/3 rounded-full" />
              </span>
            </span>
            <span className="display-num text-[34px]">
              655
              <small className="text-muted-foreground ml-0.5 text-[15px]">
                g
              </small>
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            While lent, you can&apos;t edit this spool. Anna re-weighs it; only
            you can mark it returned.
          </p>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Decline
          </DialogClose>
          <DialogClose render={<Button />} onClick={onConfirm}>
            Approve
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Mobile: Story = {
  ...BorrowRequest,
  globals: { viewport: { value: 'mobile' } },
};
