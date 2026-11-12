import { getApiTokens } from '@/app/actions/api-tokens';
import { AccountContainer } from '@/components/account/account-view';
import { passwordMinLength } from '@/lib/auth';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireUser();
  const tokens = await getApiTokens();
  return (
    <AccountContainer
      name={user.name}
      isAdmin={user.role === 'admin'}
      memberSince={user.createdAt}
      minLength={passwordMinLength}
      tokens={tokens}
      now={new Date()}
    />
  );
}
