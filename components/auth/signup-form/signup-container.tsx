'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth-client';
import { SignupForm, type SignupInput } from './signup-form';

/** Creates the account through better-auth, then opens the overview. */
function SignupContainer({ minLength }: { minLength: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signUp(input: SignupInput) {
    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email(input);
    if (error) {
      setError(error.message ?? 'Sign-up failed');
      setPending(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <SignupForm
      minLength={minLength}
      pending={pending}
      error={error}
      onSubmit={signUp}
    />
  );
}

export { SignupContainer };
