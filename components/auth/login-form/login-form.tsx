'use client';

import * as React from 'react';
import Link from 'next/link';

import { AuthCard } from '@/components/auth/auth-card';
import { PasswordField } from '@/components/common/password-field';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type LoginFormProps = {
  /** ALLOW_SIGNUP (`signupAllowed` in lib/auth.ts): shows the sign-up link. */
  showSignup: boolean;
  pending?: boolean;
  error?: string | null;
  onSubmit: (credentials: { email: string; password: string }) => void;
};

/** `/login` (Auth board, sign in). */
function LoginForm({ showSignup, pending, error, onSubmit }: LoginFormProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  return (
    <AuthCard
      title="Sign in"
      description="Manage your filament inventory"
      footer={
        showSignup && (
          <>
            No account? <Link href="/signup">Sign up</Link>
          </>
        )
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ email, password });
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
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          action={
            <Link
              href="/forgot-password"
              className="kicker text-accent-ink hover:underline"
            >
              Forgot password?
            </Link>
          }
        />
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}

export { LoginForm };
