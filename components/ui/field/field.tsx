'use client';

import * as React from 'react';
import { Field as FieldPrimitive } from '@base-ui/react/field';

import { cn } from '@/lib/utils';

/**
 * One form field: label row, control, help text and error message (`.field`).
 * Built on Base UI's Field, so the label's `htmlFor`, and the control's
 * `aria-describedby` / `aria-invalid`, are wired up automatically for Input,
 * InputGroupInput, Select, Checkbox, Switch and RadioGroup.
 *
 *   <Field invalid={Boolean(error)}>
 *     <FieldLabel required action={<button>+ Request new</button>}>Material</FieldLabel>
 *     <Input />
 *     <FieldDescription>Filament on a new spool.</FieldDescription>
 *     {error && <FieldError>{error}</FieldError>}
 *   </Field>
 */
function Field({ className, ...props }: FieldPrimitive.Root.Props) {
  return (
    <FieldPrimitive.Root
      data-slot="field"
      className={cn('flex min-w-0 flex-col gap-1.5', className)}
      {...props}
    />
  );
}

type FieldLabelProps = FieldPrimitive.Label.Props & {
  /** Shows a muted `*` after the label; also set `required` on the control. */
  required?: boolean;
  /** Right-aligned slot in the label row, e.g. a "+ Request new" link button. */
  action?: React.ReactNode;
};

function FieldLabel({
  className,
  required,
  action,
  children,
  ...props
}: FieldLabelProps) {
  const label = (
    <FieldPrimitive.Label
      data-slot="field-label"
      className={cn(
        'text-foreground text-[13px] leading-tight font-medium select-none data-disabled:opacity-50',
        !action && className
      )}
      {...props}
    >
      {children}
      {required && (
        <span aria-hidden className="text-muted-foreground ml-1">
          *
        </span>
      )}
    </FieldPrimitive.Label>
  );
  if (!action) return label;
  // The action sits next to the <label>, not inside it, so it stays its own
  // control and doesn't leak into the field's accessible name.
  return (
    <div
      data-slot="field-label-row"
      className={cn('flex items-center justify-between gap-2', className)}
    >
      {label}
      {action}
    </div>
  );
}

function FieldDescription({
  className,
  ...props
}: FieldPrimitive.Description.Props) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      className={cn('text-muted-foreground text-xs leading-snug', className)}
      {...props}
    />
  );
}

/**
 * Error message. With children it is always shown (render it conditionally
 * and pass `invalid` to Field); without, it shows the browser's validation
 * message once the control fails native constraints.
 */
function FieldError({
  className,
  match,
  children,
  ...props
}: FieldPrimitive.Error.Props) {
  return (
    <FieldPrimitive.Error
      data-slot="field-error"
      match={match ?? (children ? true : undefined)}
      className={cn('text-destructive text-xs leading-snug', className)}
      {...props}
    >
      {children}
    </FieldPrimitive.Error>
  );
}

export { Field, FieldDescription, FieldError, FieldLabel };
