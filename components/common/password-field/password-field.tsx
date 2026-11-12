'use client';

import type { ReactNode } from 'react';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PasswordFieldProps = {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  /**
   * Shows the "14 / 12" length counter and sets the native `minLength`. The
   * minimum comes from the server (`passwordMinLength`), never process.env.
   */
  minLength?: number;
  autoComplete: 'current-password' | 'new-password' | 'off';
  /** `text` for a temporary password an admin hands over. */
  type?: 'password' | 'text';
  /** Shown under the field and marks it invalid, e.g. "Passwords don't match." */
  error?: string | null;
  description?: ReactNode;
  /** Right of the label, e.g. a "Forgot password?" link. */
  action?: ReactNode;
  id?: string;
  name?: string;
  required?: boolean;
  className?: string;
};

/**
 * Password input of the Auth and Account boards: label row, the input and,
 * with `minLength`, a mono counter that turns accent once long enough.
 */
function PasswordField({
  label,
  value,
  onChange,
  minLength,
  autoComplete,
  type = 'password',
  error,
  description,
  action,
  id,
  name,
  required = true,
  className,
}: PasswordFieldProps) {
  const long = minLength !== undefined && value.length >= minLength;
  return (
    <Field
      data-slot="password-field"
      invalid={Boolean(error)}
      className={className}
    >
      <FieldLabel action={action}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(type === 'text' && 'font-mono')}
        />
        {minLength !== undefined && (
          <InputGroupAddon
            data-slot="password-counter"
            className={cn('tabular', long && 'text-accent-ink')}
          >
            {value.length} / {minLength}
          </InputGroupAddon>
        )}
      </InputGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

export { PasswordField };
