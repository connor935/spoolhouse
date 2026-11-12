'use client';

import { Button } from '@/components/ui/button';

// The pending/isAdmin 4-way label ("Add"/"Request" x "…ing"/plain) shared by
// all four material/spool-type "request new" submit buttons. `noun` (e.g.
// "material") appends to the label for the standalone forms; the inline
// mini-forms omit it since the surrounding context already says what it is.
// Passing `onClick` renders a plain button (inline mini-forms trigger the
// request manually); omitting it renders a form `submit` button.
export function RequestSubmitButton({
  isAdmin,
  pending,
  noun,
  size,
  className,
  onClick,
}: {
  isAdmin: boolean;
  pending: boolean;
  noun?: string;
  size?: 'default' | 'sm';
  className?: string;
  onClick?: () => void;
}) {
  const suffix = noun ? ` ${noun}` : '';
  const label = pending
    ? isAdmin
      ? 'Adding…'
      : 'Requesting…'
    : isAdmin
      ? `Add${suffix}`
      : `Request${suffix}`;

  return (
    <Button
      type={onClick ? 'button' : 'submit'}
      size={size}
      onClick={onClick}
      disabled={pending}
      className={className}
    >
      {label}
    </Button>
  );
}
