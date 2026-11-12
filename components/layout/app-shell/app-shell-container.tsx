'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useState, type ReactNode } from 'react';

import { authClient } from '@/lib/auth-client';
import { SIDEBAR_COOKIE, type NavCounts, type NavUser } from '@/lib/nav';
import { AppShell } from './app-shell';

const ONE_YEAR = 60 * 60 * 24 * 365;

// Thin client container for the shell: wires the router path, next-themes,
// sign-out and the collapse cookie into the presentational AppShell. The
// cookie is read by app/(app)/layout.tsx, so SSR renders the right width.
function AppShellContainer({
  counts,
  user,
  defaultCollapsed,
  children,
}: {
  counts: NavCounts;
  user: NavUser;
  defaultCollapsed: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function onCollapsedChange(next: boolean) {
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? '1' : '0'}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  }

  async function onSignOut() {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <AppShell
      counts={counts}
      user={user}
      pathname={pathname}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      theme={theme}
      onThemeChange={setTheme}
      onSignOut={onSignOut}
    >
      {children}
    </AppShell>
  );
}

export { AppShellContainer };
