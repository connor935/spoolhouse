import { notFound } from 'next/navigation';
import { SignupForm } from '@/components/signup-form';
import { passwordMinLength, signupAllowed } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  // Page-level gate; the sign-up API itself is also disabled in lib/auth.ts
  if (!signupAllowed) notFound();
  return <SignupForm minLength={passwordMinLength} />;
}
