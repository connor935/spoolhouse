'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';

export function LoginForm({ showSignup }: { showSignup: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      setError(error.message ?? 'Sign-in failed');
      setPending(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <AuthCard title="Sign in" description="Manage your filament inventory">
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          type="submit"
          disabled={pending}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
        <div className="flex flex-col items-center gap-1 text-sm">
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </Link>
          {showSignup && (
            <p className="text-muted-foreground">
              No account?{' '}
              <Link
                href="/signup"
                className="text-foreground font-medium hover:underline"
              >
                Sign up
              </Link>
            </p>
          )}
        </div>
      </form>
    </AuthCard>
  );
}
