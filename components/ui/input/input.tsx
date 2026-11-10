'use client';

import * as React from 'react';
import { Input as InputPrimitive } from '@base-ui/react/input';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// The `.inp` chrome from the design, shared by Input, InputGroup and
// SelectTrigger: 38px, card background, accent focus ring, destructive ring
// when aria-invalid. `ink` swaps the light border for the ink one.
const inputFrameVariants = cva(
  'flex h-[38px] w-full min-w-0 items-center gap-2 rounded-md border bg-card px-2.5 text-sm text-foreground transition-[border-color,box-shadow] outline-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/18',
  {
    variants: {
      variant: {
        default: 'border-input',
        ink: 'border-ink',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

const focusRing =
  'focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/22';

const numericText = 'text-right font-mono tabular';

type InputProps = React.ComponentProps<'input'> &
  VariantProps<typeof inputFrameVariants> & {
    /** Right-aligned Geist Mono with tabular figures, for weights and prices. */
    numeric?: boolean;
  };

function Input({ className, type, variant, numeric, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        inputFrameVariants({ variant }),
        focusRing,
        'file:text-foreground placeholder:text-muted-foreground file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50',
        numeric && numericText,
        className
      )}
      {...props}
    />
  );
}

/**
 * Input with adornments (units, currency, icons) inside the same frame:
 *
 *   <InputGroup>
 *     <InputGroupInput numeric defaultValue={1193} />
 *     <InputGroupAddon>g</InputGroupAddon>
 *   </InputGroup>
 *
 * The frame takes the focus and invalid styles from the input inside it, and
 * a click anywhere on it focuses the input.
 */
function InputGroup({
  className,
  variant,
  onMouseDown,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputFrameVariants>) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        inputFrameVariants({ variant }),
        'has-focus-visible:border-accent has-focus-visible:ring-accent/22 has-aria-invalid:border-destructive has-aria-invalid:ring-destructive/18 cursor-text has-focus-visible:ring-3 has-disabled:cursor-not-allowed has-disabled:opacity-50 has-aria-invalid:ring-3',
        className
      )}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        const target = event.target as HTMLElement;
        if (event.defaultPrevented || target.closest('input, button, a')) {
          return;
        }
        const input = event.currentTarget.querySelector('input');
        if (input && !input.disabled) {
          event.preventDefault();
          input.focus();
        }
      }}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  numeric,
  ...props
}: React.ComponentProps<'input'> & { numeric?: boolean }) {
  return (
    <InputPrimitive
      data-slot="input-group-control"
      className={cn(
        'placeholder:text-muted-foreground h-full w-full min-w-0 flex-1 bg-transparent p-0 outline-none disabled:cursor-not-allowed',
        numeric && numericText,
        className
      )}
      {...props}
    />
  );
}

/** Unit, currency or icon next to the input. Decorative: name units in the label. */
function InputGroupAddon({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="input-group-addon"
      aria-hidden
      className={cn(
        'text-muted-foreground flex flex-none items-center font-mono text-xs font-medium [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4',
        className
      )}
      {...props}
    />
  );
}

export {
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  inputFrameVariants,
};
