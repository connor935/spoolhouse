'use client';

import type * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const COPY = {
  add: {
    title: 'Add new spool',
    description:
      'Register a physical spool of a material. Remaining filament is calculated from the weighed total.',
    submit: 'Add spool',
  },
  edit: {
    title: 'Edit spool',
    description: 'Update this physical spool.',
    submit: 'Save changes',
  },
} as const;

type SpoolFormFrameProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  /** `dialog` on desktop (SpoolAdd/SpoolEdit), `sheet` on mobile (SpoolSheetMobile). */
  variant?: 'dialog' | 'sheet';
  /** "02 — Inventory / New spool", "Galaxy Black / #01". */
  kicker?: React.ReactNode;
  /** Validation message shown in the footer. */
  error?: string | null;
  saving?: boolean;
  deleting?: boolean;
  /** Edit only: shows "Delete spool"; the container confirms first. */
  onDelete?: () => void;
  onSubmit: () => void;
  /** The form fields. */
  children: React.ReactNode;
};

/**
 * The add/edit spool overlay: header, scrolling field area and the footer
 * actions. Fields come in as children so the container can mount its
 * server-searching pickers; the frame stays presentational.
 */
function SpoolFormFrame({
  open,
  onOpenChange,
  mode,
  variant = 'dialog',
  kicker,
  error,
  saving,
  deleting,
  onDelete,
  onSubmit,
  children,
}: SpoolFormFrameProps) {
  const copy = COPY[mode];
  const busy = saving || deleting;

  const actions = (
    <>
      {error && (
        <p
          role="alert"
          className="text-destructive text-[13px] sm:mr-auto sm:max-w-[45%]"
        >
          {error}
        </p>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="destructive-outline"
          onClick={onDelete}
          disabled={busy}
          className={cn(!error && 'sm:mr-auto')}
        >
          {deleting ? 'Deleting…' : 'Delete spool'}
        </Button>
      )}
      {!onDelete && !error && variant === 'dialog' && (
        <span className="fine hidden sm:mr-auto sm:block">* required</span>
      )}
      <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button
        type="submit"
        variant="accent"
        size={variant === 'sheet' ? 'lg' : 'default'}
        disabled={busy}
      >
        {saving ? 'Saving…' : copy.submit}
        {variant === 'dialog' && !saving && <Kbd aria-hidden>↵</Kbd>}
      </Button>
    </>
  );

  const form = (content: React.ReactNode) => (
    <form
      noValidate
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSubmit();
      }}
    >
      {content}
    </form>
  );

  if (variant === 'sheet') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom">
          <SheetHeader kicker={kicker}>
            <SheetTitle className="text-[28px]">{copy.title}</SheetTitle>
            <SheetDescription>{copy.description}</SheetDescription>
          </SheetHeader>
          {form(
            <>
              <div className="flex flex-col gap-5">{children}</div>
              <SheetFooter className="pt-2 [&>[type=submit]]:w-full">
                {actions}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader kicker={kicker}>
          <DialogTitle className="text-[32px]">{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        {form(
          <>
            <DialogBody>{children}</DialogBody>
            <DialogFooter>{actions}</DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { SpoolFormFrame };
