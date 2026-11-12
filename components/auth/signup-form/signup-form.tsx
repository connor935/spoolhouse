'use client';

import * as React from 'react';
import Link from 'next/link';

import { AuthCard } from '@/components/auth/auth-card';
import { PasswordField } from '@/components/common/password-field';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export type SignupInput = { name: string; email: string; password: string };

type SignupFormProps = {
  /** `passwordMinLength` from lib/auth.ts, passed down by the server. */
  minLength: number;
  pending?: boolean;
  error?: string | null;
  onSubmit: (input: SignupInput) => void;
};

/** `/signup` (Auth board, create account) — only reachable with ALLOW_SIGNUP. */
function SignupForm({ minLength, pending, error, onSubmit }: SignupFormProps) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [repeat, setRepeat] = React.useState('');
  const [mismatch, setMismatch] = React.useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== repeat) {
      setMismatch(true);
      return;
    }
    onSubmit({ name: name.trim(), email: email.trim(), password });
  }

  return (
    <AuthCard
      title="Create account"
      description="Track your filament inventory"
      footer={
        <>
          Have an account? <Link href="/login">Sign in</Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input
            autoComplete="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
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
        <div className="grid gap-3 sm:grid-cols-2">
          <PasswordField
            label="Password"
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
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  );
}

export { SignupForm };
