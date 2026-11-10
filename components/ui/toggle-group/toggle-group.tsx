'use client';

import * as React from 'react';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';

import { cn } from '@/lib/utils';

/**
 * Segmented control (`.seg`): ink outer border, inner dividers, mono uppercase
 * items, the pressed one inverted. Arrow keys move focus between items.
 *
 * In single mode (the default) one item always stays pressed: pressing the
 * active item again does not clear the selection.
 */
function ToggleGroup({
  className,
  multiple,
  value,
  defaultValue,
  onValueChange,
  ...props
}: ToggleGroupPrimitive.Props) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? []);
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      multiple={multiple}
      value={value ?? uncontrolled}
      onValueChange={(next, details) => {
        if (!multiple && next.length === 0) return;
        if (value === undefined) setUncontrolled(next);
        onValueChange?.(next, details);
      }}
      className={cn(
        'border-ink bg-card inline-flex w-fit items-stretch overflow-hidden rounded-md border',
        className
      )}
      {...props}
    />
  );
}

type ToggleGroupItemProps = TogglePrimitive.Props & {
  /** Count shown after the label, e.g. "In stock 14". */
  count?: number;
};

function ToggleGroupItem({
  className,
  count,
  children,
  ...props
}: ToggleGroupItemProps) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "border-border text-muted-foreground hover:text-foreground focus-visible:ring-accent/22 data-pressed:bg-foreground data-pressed:text-background inline-flex h-[34px] items-center gap-1.5 border-l px-3 font-mono text-[11px] font-medium tracking-[0.06em] whitespace-nowrap uppercase transition-colors outline-none first:border-l-0 focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-inset data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    >
      {children}
      {/* The space keeps "In stock 14" apart in the accessible name; flex
          layout drops it visually in favour of the gap. */}
      {count !== undefined && (
        <>
          {' '}
          <span className="tabular">{count}</span>
        </>
      )}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };
