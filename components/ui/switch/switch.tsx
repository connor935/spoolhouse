'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '@/lib/utils';

/** 38×22 track with ink border on a muted fill; accent when on (`.switch`). */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer border-ink bg-muted focus-visible:ring-accent/22 aria-invalid:border-destructive aria-invalid:ring-destructive/18 data-checked:border-accent data-checked:bg-accent relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border px-0.5 transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 aria-invalid:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="border-ink bg-card data-checked:border-accent pointer-events-none block size-4 rounded-full border transition-transform data-checked:translate-x-4"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
