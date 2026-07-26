'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    });
    // Always report success — don't leak which emails have accounts
    setSent(true);
    setPending(false);
  }

  return (
    <AuthCard
      title="Reset password"
      description="We'll send a reset link to your email address."
    >
      {sent ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            If an account exists for{' '}
            <span className="font-medium">{email}</span>, a reset link is on its
            way.
          </p>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {pending ? 'Sending…' : 'Send reset link'}
          </Button>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-center text-sm"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
