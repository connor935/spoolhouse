'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BorrowsPanel } from '@/components/borrows-panel';
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
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Borrows</DialogTitle>
          <DialogDescription>
            Requests, lends and history across your groups.
          </DialogDescription>
        </DialogHeader>
        <BorrowsPanel lends={lends} currentUserId={currentUserId} />
      </DialogContent>
    </Dialog>
  );
}
