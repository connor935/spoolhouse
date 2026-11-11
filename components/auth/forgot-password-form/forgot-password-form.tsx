'use client';

import * as React from 'react';
import Link from 'next/link';

import { AuthCard } from '@/components/auth/auth-card';
import { Note } from '@/components/common/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type ForgotPasswordFormProps = {
  /** A request went out: the note shows, the button turns secondary. */
  sent?: boolean;
  pending?: boolean;
  onSubmit: (email: string) => void;
};

/** `/forgot-password` (Auth board, reset request + sent state). */
function ForgotPasswordForm({
  sent,
  pending,
  onSubmit,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = React.useState('');

  return (
    <AuthCard
      title="Reset password"
      description="We'll email you a link to set a new one."
      footer={<Link href="/login">← Back to sign in</Link>}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email.trim());
        }}
        className="flex flex-col gap-3.5"
      >
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {/* Always the same answer: never reveal which emails have accounts. */}
        {sent && (
          <Note>
            If an account exists for this address, a reset link is on its way.
            Check your inbox.
          </Note>
        )}
        <Button
          type="submit"
          size="lg"
          variant={sent ? 'outline' : 'default'}
          className="w-full"
          disabled={pending}
        >
          {pending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthCard>
  );
}

export { ForgotPasswordForm };
