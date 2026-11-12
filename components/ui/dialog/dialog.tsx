'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 bg-scrim fixed inset-0 isolate z-50 duration-100',
        className
      )}
      {...props}
    />
  );
}

// Layout (.dlg): header with a 2px ink rule, padded body, muted footer.
// Children are DialogHeader / DialogBody / DialogFooter; a <form> wrapping
// body + footer should be `className="contents"` so they stay flex children
// and the body is the part that scrolls.
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'bg-card text-card-foreground border-ink shadow-dialog data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[8px] border text-sm duration-100 outline-none sm:max-w-md',
          // Keep a long title clear of the close button.
          'has-[>[data-slot=dialog-close]]:[&_[data-slot=dialog-header]]:pr-14',
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="text-muted-foreground absolute top-4 right-4"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

const dialogHeaderVariants = cva('flex shrink-0 flex-col', {
  variants: {
    variant: {
      // .dlg-h
      ruled: 'border-ink gap-1.5 border-b-2 px-6 pt-5 pb-4',
      // Short confirms (Patterns 02): no rule, the footer follows directly.
      plain: 'gap-2 px-[22px] py-5',
    },
  },
  defaultVariants: { variant: 'ruled' },
});

function DialogHeader({
  className,
  variant,
  kicker,
  children,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof dialogHeaderVariants> & {
    /** Mono caption above the title, e.g. "Print Farm Friends · just now". */
    kicker?: React.ReactNode;
  }) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(dialogHeaderVariants({ variant }), className)}
      {...props}
    >
      {kicker && (
        <p data-slot="dialog-kicker" className="kicker mb-0.5">
          {kicker}
        </p>
      )}
      {children}
    </div>
  );
}

// .dlg-b
function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        'flex min-h-0 flex-col gap-5 overflow-y-auto px-6 py-5',
        className
      )}
      {...props}
    />
  );
}

// .dlg-f
function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex shrink-0 flex-col-reverse gap-2 border-t bg-[color-mix(in_oklab,var(--color-muted)_45%,var(--color-card))] px-6 py-3.5 sm:flex-row sm:items-center sm:justify-end',
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('display-h2', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3',
        className
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
