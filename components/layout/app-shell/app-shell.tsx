'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { NavDrawer } from '@/components/layout/nav-drawer';
import type { ThemeChoice } from '@/components/layout/theme-switch';
import {
  ACCOUNT_NAV_ITEM,
  buildBottomNav,
  buildNav,
  findActiveKey,
  flattenNav,
  type NavCounts,
  type NavUser,
} from '@/lib/nav';

export type AppShellProps = {
  counts: NavCounts;
  user: NavUser;
  /** Current path; decides the active nav item. */
  pathname: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  theme: string | undefined;
  onThemeChange: (theme: ThemeChoice) => void;
  onSignOut: () => void;
  children: ReactNode;
};

// The signed-in frame (`.page` / `.side` / `.main` / `.wrap`): sidebar from
// md up; top bar, drawer and bottom nav below. Pages render into a 1280px
// column with 28/40px padding (18/16 on mobile, plus room for the bottom nav).
function AppShell({
  counts,
  user,
  pathname,
  collapsed,
  onCollapsedChange,
  theme,
  onThemeChange,
  onSignOut,
  children,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const bottomItems = useMemo(() => buildBottomNav(counts), [counts]);
  const activeKey = useMemo(
    () =>
      findActiveKey(pathname, [
        ...flattenNav(buildNav(counts, user.isAdmin)),
        ACCOUNT_NAV_ITEM,
      ]),
    [pathname, counts, user.isAdmin]
  );
  const bottomActiveKey = findActiveKey(pathname, bottomItems);
  const menu = { user, theme, onThemeChange, onSignOut };

  return (
    <div data-slot="app-shell" className="flex min-h-dvh">
      <a
        href="#main"
        className="bg-card border-ink focus-visible:ring-ring sr-only z-50 rounded-[6px] border px-3 py-2 text-sm outline-none focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:ring-2"
      >
        Skip to content
      </a>
      <AppSidebar
        {...menu}
        counts={counts}
        activeKey={activeKey}
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
        className="self-start max-md:hidden"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar
          unreadNotifications={counts.unreadNotifications}
          navOpen={drawerOpen}
          onOpenNav={() => setDrawerOpen(true)}
          className="md:hidden"
        />
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 px-4 pt-[18px] pb-[calc(88px+env(safe-area-inset-bottom))] outline-none md:px-10 md:pt-7 md:pb-14"
        >
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7">
            {children}
          </div>
        </main>
      </div>
      <BottomNav
        items={bottomItems}
        activeKey={bottomActiveKey}
        className="md:hidden"
      />
      <NavDrawer
        {...menu}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        counts={counts}
        activeKey={activeKey}
      />
    </div>
  );
}

export { AppShell };
