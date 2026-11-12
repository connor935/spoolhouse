'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { authClient } from '@/lib/auth-client';
import { ResetPasswordForm } from './reset-password-form';

/** Sets the new password with the link's token, then back to sign in. */
function ResetPasswordContainer({ minLength }: { minLength: number }) {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reset(newPassword: string) {
    if (!token) return;
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token });
    if (error) {
      setError(error.message ?? 'Reset failed — the link may have expired.');
      setPending(false);
      return;
    }
    toast.success('Password updated — sign in with your new password');
    router.push('/login');
  }

  return (
    <ResetPasswordForm
      minLength={minLength}
      hasToken={Boolean(token)}
      pending={pending}
      error={error}
      onSubmit={reset}
    />
  );
}

export { ResetPasswordContainer };
