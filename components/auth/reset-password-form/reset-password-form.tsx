'use client';

import * as React from 'react';
import Link from 'next/link';

import { AuthCard } from '@/components/auth/auth-card';
import { Alert } from '@/components/common/alert';
import { PasswordField } from '@/components/common/password-field';
import { Button } from '@/components/ui/button';

type ResetPasswordFormProps = {
  /** `passwordMinLength` from lib/auth.ts, passed down by the server. */
  minLength: number;
  /** False when the link carries no reset token. */
  hasToken: boolean;
  pending?: boolean;
  error?: string | null;
  onSubmit: (password: string) => void;
};

/** `/reset-password?token=…` (Auth board, set new password). */
function ResetPasswordForm({
  minLength,
  hasToken,
  pending,
  error,
  onSubmit,
}: ResetPasswordFormProps) {
  const [password, setPassword] = React.useState('');
  const [repeat, setRepeat] = React.useState('');
  const [mismatch, setMismatch] = React.useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== repeat) {
      setMismatch(true);
      return;
    }
    onSubmit(password);
  }

  return (
    <AuthCard
      title="Set new password"
      description={`At least ${minLength} characters.`}
      footer={<Link href="/login">← Back to sign in</Link>}
    >
      {!hasToken ? (
        <Alert
          action={
            <Link
              href="/forgot-password"
              className="kicker text-accent-ink hover:underline"
            >
              New link
            </Link>
          }
        >
          This reset link is invalid or incomplete.
        </Alert>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <PasswordField
            label="New password"
            autoComplete="new-password"
            minLength={minLength}
            value={password}
            onChange={(v) => {
              setPassword(v);
              setMismatch(false);
            }}
          />
          <PasswordField
            label="Repeat"
            autoComplete="new-password"
            value={repeat}
            onChange={(v) => {
              setRepeat(v);
              setMismatch(false);
            }}
            error={mismatch ? "Passwords don't match." : null}
          />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? 'Saving…' : 'Set new password'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export { ResetPasswordForm };
