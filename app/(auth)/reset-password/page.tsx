import { Suspense } from 'react';
import { ResetPasswordContainer } from '@/components/auth/reset-password-form';
import { passwordMinLength } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  // useSearchParams (the reset token) needs a Suspense boundary.
  return (
    <Suspense>
      <ResetPasswordContainer minLength={passwordMinLength} />
    </Suspense>
  );
}
