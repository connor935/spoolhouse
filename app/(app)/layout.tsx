import { cookies } from 'next/headers';
import { AppShellContainer } from '@/components/layout/app-shell';
import { requireUser } from '@/lib/auth-session';
import { SIDEBAR_COOKIE } from '@/lib/nav';
import { getNavCounts } from '@/lib/nav-counts';

// Every signed-in page renders inside the sidebar shell. Pages still call
// requireUser()/requireAdmin() themselves: layouts don't re-run on every
// navigation, so they are not an authorization boundary.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [counts, cookieStore] = await Promise.all([getNavCounts(), cookies()]);
  return (
    <AppShellContainer
      counts={counts}
      user={{ name: user.name, isAdmin: user.role === 'admin' }}
      defaultCollapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === '1'}
    >
      {children}
    </AppShellContainer>
  );
}
