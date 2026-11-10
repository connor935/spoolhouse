import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { DEFAULT_MATERIAL_COLOR } from '@/lib/filament';
import { cn } from '@/lib/utils';

// `.sw`: round colour dot with a faint ring and an inset shadow, so light
// colours still read on a white card.
const swatchVariants = cva(
  'inline-block shrink-0 rounded-full border border-swatch-ring shadow-swatch',
  {
    variants: {
      size: {
        sm: 'size-3.5',
        md: 'size-[22px]',
        lg: 'size-7',
        xl: 'size-[34px]',
      },
    },
    defaultVariants: { size: 'sm' },
  }
);

type SwatchProps = Omit<React.ComponentProps<'span'>, 'color'> &
  VariantProps<typeof swatchVariants> & {
    /** Material colour (hex); missing colours fall back to DEFAULT_MATERIAL_COLOR. */
    color?: string | null;
    /** Accessible name, e.g. the colour name. Defaults to "Colour #22242A". */
    label?: string;
    /** Hide from assistive tech when the colour is already named next to it. */
    decorative?: boolean;
  };

function Swatch({
  className,
  size,
  color,
  label,
  decorative,
  style,
  ...props
}: SwatchProps) {
  const value = color || DEFAULT_MATERIAL_COLOR;
  return (
    <span
      data-slot="swatch"
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': label ?? `Colour ${value}` })}
      className={cn(swatchVariants({ size }), className)}
      // The one place a colour comes from data rather than a token.
      style={{ ...style, backgroundColor: value }}
      {...props}
    />
  );
}

export { Swatch, swatchVariants };
