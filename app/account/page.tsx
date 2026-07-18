import { AccountForms } from '@/components/account-forms';
import { ApiTokensSection } from '@/components/api-tokens-section';
import { PageShell } from '@/components/page-shell';
import { getApiTokens } from '@/app/actions/api-tokens';
import { passwordMinLength } from '@/lib/auth';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await requireUser();
  const tokens = await getApiTokens();
  return (
    <PageShell title="Account" description={user.email}>
      <AccountForms name={user.name} minLength={passwordMinLength} />
      <div className="mt-6">
        <ApiTokensSection tokens={tokens} />
      </div>
    </PageShell>
  );
}
