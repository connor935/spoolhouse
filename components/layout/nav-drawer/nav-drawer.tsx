'use client';

import Link from 'next/link';
import { CircleUserRound, LogOut, Settings, X } from 'lucide-react';
import { useMemo } from 'react';

import { BrandLogo } from '@/components/layout/brand-logo';
import { NavList } from '@/components/layout/nav-list';
import {
  ThemeSwitch,
  type ThemeChoice,
} from '@/components/layout/theme-switch';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { buildNav, type NavCounts, type NavUser } from '@/lib/nav';
import { cn } from '@/lib/utils';

const iconButton =
  'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-9 place-items-center rounded-[6px] outline-none focus-visible:ring-2 [&_svg]:size-[18px]';

export type NavDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: NavCounts;
  user: NavUser;
  activeKey: string | null;
  theme: string | undefined;
  onThemeChange: (theme: ThemeChoice) => void;
  onSignOut: () => void;
};

// Mobile navigation drawer (MobileDrawer.dc.html): the sidebar's items at
// touch size in a left sheet, with account, sign-out and the theme switch at
// the bottom. Following a link closes it.
function NavDrawer({
  open,
  onOpenChange,
  counts,
  user,
  activeKey,
  theme,
  onThemeChange,
  onSignOut,
}: NavDrawerProps) {
  const sections = useMemo(
    () => buildNav(counts, user.isAdmin),
    [counts, user.isAdmin]
  );
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" showCloseButton={false}>
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="mb-2 flex h-[52px] flex-none items-center gap-2.5 pl-1">
          <BrandLogo />
          <SheetClose
            aria-label="Close navigation"
            className={cn(iconButton, 'ml-auto')}
          >
            <X />
          </SheetClose>
        </div>
        <NavList
          sections={sections}
          activeKey={activeKey}
          size="lg"
          onNavigate={close}
        />
        <div className="border-border mt-auto flex flex-col gap-2.5 border-t pt-3">
          <div className="flex items-center gap-2.5 px-1">
            <CircleUserRound
              aria-hidden
              className="text-muted-foreground size-5 flex-none"
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{user.name}</span>
              <span className="text-muted-foreground text-xs">
                {user.isAdmin ? 'Admin' : 'Member'}
              </span>
            </span>
            <Link
              href="/account"
              aria-label="Account"
              aria-current={activeKey === 'account' ? 'page' : undefined}
              onClick={close}
              className={iconButton}
            >
              <Settings />
            </Link>
            <button
              type="button"
              aria-label="Sign out"
              onClick={onSignOut}
              className={iconButton}
            >
              <LogOut />
            </button>
          </div>
          <ThemeSwitch value={theme} onValueChange={onThemeChange} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { NavDrawer };
