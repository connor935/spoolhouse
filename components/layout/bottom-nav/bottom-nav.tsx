'use client';

import Link from 'next/link';

import { badgeText, type NavItem } from '@/lib/nav';
import { cn } from '@/lib/utils';

// Mobile bottom navigation (MobileInventory.dc.html `.bn`): five items with
// mono labels, a 3px accent bar on top of the active one and an accent count
// for work that waits (borrow requests). Items come from buildBottomNav().
function BottomNav({
  items,
  activeKey,
  className,
}: {
  items: NavItem[];
  activeKey: string | null;
  className?: string;
}) {
  return (
    <nav
      aria-label="Main"
      data-slot="bottom-nav"
      className={cn(
        'bg-sidebar border-ink fixed inset-x-0 bottom-0 z-30 flex border-t pb-[max(4px,env(safe-area-inset-bottom))]',
        className
      )}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'text-muted-foreground focus-visible:ring-ring relative flex h-[60px] flex-1 flex-col items-center justify-center gap-1 font-mono text-[10px] font-medium tracking-[0.06em] uppercase outline-none focus-visible:ring-2 focus-visible:ring-inset',
              active &&
                'text-foreground before:bg-accent [&_svg]:text-accent before:absolute before:inset-x-[22%] before:-top-px before:h-[3px]'
            )}
          >
            {Icon && <Icon aria-hidden className="size-5" />}
            {item.label}
            {item.badge && (
              <>
                <span
                  aria-hidden
                  data-slot="nav-badge"
                  data-tone={item.badge.tone}
                  className={cn(
                    'absolute top-1.5 left-1/2 ml-1 h-4 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-semibold tracking-normal',
                    item.badge.tone === 'pill'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {badgeText(item.badge)}
                </span>
                <span className="sr-only">, {item.badge.label}</span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export { BottomNav };
