'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ConfirmOptions } from '@/hooks/use-confirm';

// Renders whatever useConfirm() is currently asking about — pair one of
// these with each useConfirm() call site.
export function ConfirmDialog({
  open,
  options,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{options?.title}</DialogTitle>
          {options?.description && (
            <DialogDescription>{options.description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {options?.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            type="button"
            variant={options?.destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {options?.confirmLabel ?? 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
