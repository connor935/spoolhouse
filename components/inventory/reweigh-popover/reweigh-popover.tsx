'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
} from '@/components/ui/popover';

import { ReweighForm } from '../reweigh-form';

type ReweighPopoverProps = React.ComponentProps<typeof ReweighForm> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The tile it points at (MaterialBlock's `tileRef`). */
  anchor: Element | null;
  /** e.g. "Re-weigh #03 Galaxy Black". */
  title: React.ReactNode;
};

/**
 * Desktop re-weigh (Reweigh board): a popover anchored to the clicked spool
 * tile. The tile isn't the popover trigger (it has its own buttons), so the
 * container controls `open` and passes the tile element as `anchor`.
 */
function ReweighPopover({
  open,
  onOpenChange,
  anchor,
  title,
  ...formProps
}: ReweighPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent
        anchor={anchor}
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-80"
      >
        <div className="flex items-center justify-between gap-2">
          <PopoverTitle className="text-[22px]">{title}</PopoverTitle>
          <PopoverClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </PopoverClose>
        </div>
        {/* Remount per spool so the input starts from that spool's weight. */}
        <ReweighForm key={formProps.spool.id} {...formProps} />
      </PopoverContent>
    </Popover>
  );
}

export { ReweighPopover };
