import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { formatWeight } from '@/lib/filament';
import { cn } from '@/lib/utils';

// Condensed display numerals with a small muted unit (`.w`, `.num small`).
const weightVariants = cva('inline-flex items-baseline whitespace-nowrap', {
  variants: {
    size: {
      /** Spool tiles (`.w`, 24px). */
      tile: 'display-weight',
      /** Material block totals (30px). */
      block: 'display-weight text-[30px] leading-[0.95]',
      /** Re-weigh preview and readouts (`.num`, 40px). */
      readout: 'display-num',
    },
  },
  defaultVariants: { size: 'tile' },
});

const unitSize = {
  tile: 'text-xs',
  block: 'text-xs',
  readout: 'text-[15px]',
} as const;

type WeightDisplayProps = React.ComponentProps<'span'> &
  VariantProps<typeof weightVariants> & {
    grams: number;
  };

/** `formatWeight()` split into number and unit: "742 g", "2.16 kg". */
function WeightDisplay({
  className,
  size,
  grams,
  ...props
}: WeightDisplayProps) {
  const [value, unit] = formatWeight(grams).split(' ');
  return (
    <span
      data-slot="weight-display"
      className={cn(weightVariants({ size }), className)}
      {...props}
    >
      {value}{' '}
      <small
        className={cn(
          'text-muted-foreground ml-0.5 font-sans font-medium',
          unitSize[size ?? 'tile']
        )}
      >
        {unit}
      </small>
    </span>
  );
}

export { WeightDisplay, weightVariants };
