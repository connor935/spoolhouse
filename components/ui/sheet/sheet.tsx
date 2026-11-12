'use client';

import * as React from 'react';
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        'bg-scrim fixed inset-0 z-50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0',
        className
      )}
      {...props}
    />
  );
}

type SheetSide = 'top' | 'right' | 'bottom' | 'left';

const sheetContentVariants = cva(
  'text-card-foreground fixed z-50 flex flex-col text-sm transition duration-200 ease-in-out outline-none data-ending-style:opacity-0 data-starting-style:opacity-0',
  {
    variants: {
      side: {
        // Mobile forms, filters, re-weigh (Reweigh.dc.html): ink top rule,
        // 14px top corners. The rule runs on down the sides: a top-only
        // border tapers to nothing around rounded corners, which in dark mode
        // (translucent light ink) read as a glow above the sheet.
        bottom:
          'bg-card border-ink inset-x-0 bottom-0 max-h-[90dvh] gap-4 overflow-y-auto rounded-t-[14px] border-2 border-b-0 px-[18px] pt-2.5 pb-[26px] data-ending-style:translate-y-10 data-starting-style:translate-y-10',
        // Navigation drawer (MobileDrawer.dc.html).
        left: 'bg-sidebar text-sidebar-foreground shadow-toast inset-y-0 left-0 w-[304px] max-w-[85vw] gap-2 overflow-y-auto border-r px-3 pt-2 pb-3 data-ending-style:-translate-x-10 data-starting-style:-translate-x-10',
        right:
          'bg-card border-ink shadow-dialog inset-y-0 right-0 w-full max-w-sm gap-4 overflow-y-auto border-l p-6 data-ending-style:translate-x-10 data-starting-style:translate-x-10',
        top: 'bg-card border-ink inset-x-0 top-0 max-h-[90dvh] gap-4 overflow-y-auto rounded-b-[14px] border-2 border-t-0 px-[18px] pt-[26px] pb-4 data-ending-style:-translate-y-10 data-starting-style:-translate-y-10',
      },
    },
    defaultVariants: { side: 'right' },
  }
);

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  showHandle = side === 'bottom',
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: SheetSide;
  showCloseButton?: boolean;
  /** Decorative grab bar on top of a bottom sheet (on by default there). */
  showHandle?: boolean;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(sheetContentVariants({ side }), className)}
        {...props}
      >
        {showHandle && (
          <span
            data-slot="sheet-handle"
            aria-hidden
            className="bg-border h-1 w-10 shrink-0 self-center rounded-full"
          />
        )}
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className={cn(
                  'text-muted-foreground absolute right-3',
                  side === 'bottom' ? 'top-5' : 'top-3'
                )}
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  kicker,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  /** Mono caption above the title, e.g. "Borrowed from Mia Koch". */
  kicker?: React.ReactNode;
}) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 pr-10', className)}
      {...props}
    >
      {kicker && (
        <p data-slot="sheet-kicker" className="kicker">
          {kicker}
        </p>
      )}
      {children}
    </div>
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2', className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('display-h2', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
