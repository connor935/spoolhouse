'use client';

import Link from 'next/link';
import { Bell, Menu } from 'lucide-react';

import { BrandLogo } from '@/components/layout/brand-logo';
import { cn } from '@/lib/utils';

const iconButton =
  'text-foreground hover:bg-muted focus-visible:ring-ring relative grid size-11 place-items-center rounded-[8px] outline-none focus-visible:ring-2 [&_svg]:size-5';

// Mobile header (MobileInventory.dc.html): drawer toggle, logo, and the
// notifications bell with an unread dot. Hidden from md up, where the
// sidebar takes over.
function MobileTopBar({
  unreadNotifications,
  navOpen = false,
  onOpenNav,
  className,
}: {
  unreadNotifications: number;
  navOpen?: boolean;
  onOpenNav: () => void;
  className?: string;
}) {
  return (
    <header
      data-slot="mobile-top-bar"
      className={cn(
        'bg-sidebar text-sidebar-foreground border-border sticky top-0 z-30 flex h-14 flex-none items-center gap-1.5 border-b px-1.5',
        className
      )}
    >
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={navOpen}
        onClick={onOpenNav}
        className={iconButton}
      >
        <Menu />
      </button>
      <Link
        href="/"
        aria-label="Spoolhouse — overview"
        className="focus-visible:ring-ring rounded-[7px] outline-none focus-visible:ring-2"
      >
        <BrandLogo className="[&>span:last-child]:text-base" />
      </Link>
      <Link
        href="/notifications"
        aria-label={
          unreadNotifications > 0
            ? `Notifications, ${unreadNotifications} unread`
            : 'Notifications'
        }
        className={cn(iconButton, 'ml-auto')}
      >
        <Bell />
        {unreadNotifications > 0 && (
          <span
            aria-hidden
            data-slot="unread-dot"
            className="bg-accent border-sidebar absolute top-2.5 right-2.5 box-content size-2 rounded-full border-2"
          />
        )}
      </Link>
    </header>
  );
}

export { MobileTopBar };
