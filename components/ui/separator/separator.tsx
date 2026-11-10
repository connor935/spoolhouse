'use client';

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import { cn } from '@/lib/utils';

function Separator({
  className,
  orientation = 'horizontal',
  variant = 'default',
  ...props
}: SeparatorPrimitive.Props & {
  /** `ink`: the strong 1px rule used under headers and table heads. */
  variant?: 'default' | 'ink';
}) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      data-variant={variant}
      orientation={orientation}
      className={cn(
        'shrink-0 data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch',
        variant === 'ink' ? 'bg-ink' : 'bg-border',
        className
      )}
      {...props}
    />
  );
}

export { Separator };
