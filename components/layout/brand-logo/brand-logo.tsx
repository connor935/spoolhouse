import { Boxes } from 'lucide-react';

import { cn } from '@/lib/utils';

// `.logo`: 32px accent tile with the Boxes mark, optionally followed by the
// word mark. Decorative — the surrounding link or landmark carries the name.
function BrandLogo({
  withName = true,
  className,
}: {
  withName?: boolean;
  className?: string;
}) {
  return (
    <span
      data-slot="brand-logo"
      className={cn('flex items-center gap-2.5', className)}
    >
      <span
        aria-hidden
        className="bg-accent text-accent-foreground grid size-8 flex-none place-items-center rounded-[7px]"
      >
        <Boxes className="size-[18px]" strokeWidth={1.5} />
      </span>
      {withName && (
        <span className="text-[17px] font-semibold tracking-[-0.03em]">
          Spoolhouse
        </span>
      )}
    </span>
  );
}

export { BrandLogo };
