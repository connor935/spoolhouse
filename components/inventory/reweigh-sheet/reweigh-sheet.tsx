'use client';

import * as React from 'react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { ReweighForm } from '../reweigh-form';

type ReweighSheetProps = Omit<
  React.ComponentProps<typeof ReweighForm>,
  'size' | 'borrowed'
> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "Re-weigh #04 Basic Cyan". */
  title: React.ReactNode;
  /** Owner's name when the viewer borrows the spool ("Borrowed from Mia Koch"). */
  borrowedFromName?: string | null;
};

/** Mobile re-weigh (Reweigh board): a bottom sheet around the same form. */
function ReweighSheet({
  open,
  onOpenChange,
  title,
  borrowedFromName,
  ...formProps
}: ReweighSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader
          kicker={
            borrowedFromName ? `Borrowed from ${borrowedFromName}` : undefined
          }
        >
          <SheetTitle className="text-[28px]">{title}</SheetTitle>
        </SheetHeader>
        <ReweighForm
          key={formProps.spool.id}
          size="sheet"
          borrowed={Boolean(borrowedFromName)}
          {...formProps}
        />
      </SheetContent>
    </Sheet>
  );
}

export { ReweighSheet };
