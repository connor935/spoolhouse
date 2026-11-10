'use client';

import * as React from 'react';
import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';

import { cn } from '@/lib/utils';

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn('grid w-full gap-2', className)}
      {...props}
    />
  );
}

// The round `.radio .o` indicator. `group-data-checked` lets the card variant
// drive it from the card's own checked state.
const dotClasses =
  'grid size-4 shrink-0 place-items-center rounded-full border border-ink bg-card after:size-2 after:rounded-full after:bg-accent after:opacity-0 group-data-checked/radio:border-accent group-data-checked/radio:after:opacity-100';

/** A bare radio; pair it with a `<label>` or put it in a Field. */
function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        'group/radio focus-visible:ring-accent/22 relative rounded-full outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className
      )}
      {...props}
    >
      <span aria-hidden className={dotClasses} />
    </RadioPrimitive.Root>
  );
}

type RadioGroupCardProps = Omit<RadioPrimitive.Root.Props, 'children'> & {
  title: React.ReactNode;
  description?: React.ReactNode;
};

/**
 * Card radio (`.radio`): bordered row with indicator, title and description;
 * selected = accent border + 1px accent shadow. The title names the radio and
 * the description describes it.
 */
function RadioGroupCard({
  className,
  title,
  description,
  ...props
}: RadioGroupCardProps) {
  const id = React.useId();
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-card"
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      className={cn(
        'group/radio border-border bg-card focus-visible:ring-accent/22 data-checked:border-accent flex w-full cursor-pointer items-start gap-2.5 rounded-[6px] border px-3.5 py-3 text-left text-sm transition-[border-color,box-shadow] outline-none focus-visible:ring-3 data-checked:shadow-[0_0_0_1px_var(--color-accent)] data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className
      )}
      {...props}
    >
      <span aria-hidden className={cn(dotClasses, 'mt-0.5')} />
      <span className="flex flex-col gap-0.5">
        <span id={`${id}-title`} className="text-foreground font-medium">
          {title}
        </span>
        {description && (
          <span
            id={`${id}-description`}
            className="text-muted-foreground text-xs leading-snug"
          >
            {description}
          </span>
        )}
      </span>
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupCard, RadioGroupItem };
