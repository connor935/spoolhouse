import * as React from 'react';

import { cn } from '@/lib/utils';

// `.kbd`: a keyboard-shortcut hint. Border and text follow `currentColor`, so it
// sits on any surface (accent button, inverted tooltip, plain text).
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'inline-grid h-[18px] min-w-[18px] place-items-center rounded-[3px] border border-current px-1 font-mono text-[11px] leading-none font-medium opacity-70 select-none',
        className
      )}
      {...props}
    />
  );
}

export { Kbd };
