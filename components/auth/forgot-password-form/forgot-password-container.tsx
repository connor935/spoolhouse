'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { authClient } from '@/lib/auth-client';
import { ForgotPasswordForm } from './forgot-password-form';

/** Requests a reset mail; the link points at /reset-password. */
function ForgotPasswordContainer() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function request(email: string) {
    setPending(true);
    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      });
      // Always report success — don't leak which emails have accounts.
      setSent(true);
    } catch {
      // Only a failed request lands here (offline, server down), never an
      // unknown address, so this says nothing about which accounts exist.
      toast.error('Could not send the request — check your connection');
    } finally {
      setPending(false);
    }
  }

  return (
    <ForgotPasswordForm sent={sent} pending={pending} onSubmit={request} />
  );
}

export { ForgotPasswordContainer };
