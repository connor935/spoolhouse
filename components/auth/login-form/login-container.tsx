'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth-client';
import { LoginForm } from './login-form';

/** Signs in through better-auth, then opens the overview. */
function LoginContainer({ showSignup }: { showSignup: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(credentials: { email: string; password: string }) {
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email(credentials);
    if (error) {
      setError(error.message ?? 'Sign-in failed');
      setPending(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <LoginForm
      showSignup={showSignup}
      pending={pending}
      error={error}
      onSubmit={signIn}
    />
  );
}

export { LoginContainer };
