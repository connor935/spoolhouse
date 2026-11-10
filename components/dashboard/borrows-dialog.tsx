'use client';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BorrowsPanel } from '@/components/dashboard/borrows-panel';
import type { MyLend } from '@/app/actions/lends';

// Wraps the cross-group BorrowsPanel in a modal, opened from the dashboard's
// "Borrows" toolbar button (replaces the old top-level Borrows tab).
export function BorrowsDialog({
  open,
  onOpenChange,
  lends,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lends: MyLend[];
  currentUserId: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Borrows</DialogTitle>
          <DialogDescription>
            Requests, lends and history across your groups.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <BorrowsPanel lends={lends} currentUserId={currentUserId} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
