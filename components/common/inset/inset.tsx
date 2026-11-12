import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

// Design language: `.inset` in .claude/design/spoolhouse.css — a dashed panel
// set into a form or dialog (spool details, request side panels).
function Inset({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="inset"
      className={cn(
        'border-ink flex flex-col gap-3 rounded-[6px] border border-dashed bg-[color-mix(in_oklab,var(--muted)_35%,var(--card))] p-3.5',
        className
      )}
      {...props}
    />
  );
}

export { Inset };
