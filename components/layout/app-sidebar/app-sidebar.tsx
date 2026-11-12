'use client';

import Link from 'next/link';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Fragment, useMemo } from 'react';

import { BrandLogo } from '@/components/layout/brand-logo';
import { NavList } from '@/components/layout/nav-list';
import type { ThemeChoice } from '@/components/layout/theme-switch';
import { UserMenu } from '@/components/layout/user-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  badgeText,
  buildNav,
  type NavCounts,
  type NavItem,
  type NavUser,
} from '@/lib/nav';
import { cn } from '@/lib/utils';

export type AppSidebarProps = {
  counts: NavCounts;
  user: NavUser;
  /** Key of the current page's item (see findActiveKey in lib/nav.ts). */
  activeKey: string | null;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  theme: string | undefined;
  onThemeChange: (theme: ThemeChoice) => void;
  onSignOut: () => void;
  className?: string;
};

const iconButton =
  'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-8 place-items-center rounded-[6px] outline-none focus-visible:ring-2 [&_svg]:size-[18px]';

// Persistent desktop sidebar (Sidebar.dc.html / Nav.dc.html): 240px expanded,
// 56px icon rail when collapsed. Presentational — the shell container passes
// the counts, the active key and the callbacks.
function AppSidebar({
  counts,
  user,
  activeKey,
  collapsed,
  onCollapsedChange,
  theme,
  onThemeChange,
  onSignOut,
  className,
}: AppSidebarProps) {
  const sections = useMemo(
    () => buildNav(counts, user.isAdmin),
    [counts, user.isAdmin]
  );
  const userMenu = (
    <UserMenu
      user={user}
      theme={theme}
      onThemeChange={onThemeChange}
      onSignOut={onSignOut}
      collapsed={collapsed}
      active={activeKey === 'account'}
    />
  );

  return (
    <div
      data-slot="app-sidebar"
      data-collapsed={collapsed}
      className={cn(
        'bg-sidebar text-sidebar-foreground border-border sticky top-0 flex h-dvh flex-none flex-col border-r',
        collapsed ? 'w-14 items-center px-0 py-3' : 'w-60 p-3',
        className
      )}
    >
      {collapsed ? (
        <TooltipProvider>
          <Link
            href="/"
            aria-label="Spoolhouse — overview"
            className="focus-visible:ring-ring mt-1 mb-3.5 rounded-[7px] outline-none focus-visible:ring-2"
          >
            <BrandLogo withName={false} />
          </Link>
          <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-2">
            {sections.map((section, i) => (
              <Fragment key={section.key}>
                {i > 0 && (
                  <div aria-hidden className="bg-border my-2.5 h-px w-6" />
                )}
                <nav
                  aria-label={section.label ?? 'Main'}
                  className="flex flex-col items-center gap-1"
                >
                  {section.items.map((item) => (
                    <RailLink
                      key={item.key}
                      item={item}
                      active={
                        activeKey === item.key ||
                        !!item.children?.some((c) => c.key === activeKey)
                      }
                    />
                  ))}
                </nav>
              </Fragment>
            ))}
          </div>
          <div className="border-border mt-2 flex w-10 flex-col items-center gap-1 border-t pt-2.5">
            <Tooltip>
              <TooltipTrigger
                aria-label="Expand sidebar"
                onClick={() => onCollapsedChange(false)}
                className={cn(iconButton, 'size-10 rounded-[8px]')}
              >
                <PanelLeftOpen />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Expand sidebar
              </TooltipContent>
            </Tooltip>
            {userMenu}
          </div>
        </TooltipProvider>
      ) : (
        <>
          <div className="flex items-center gap-2.5 pt-1 pr-1 pb-3.5 pl-1.5">
            <Link
              href="/"
              aria-label="Spoolhouse — overview"
              className="focus-visible:ring-ring rounded-[7px] outline-none focus-visible:ring-2"
            >
              <BrandLogo />
            </Link>
            <button
              type="button"
              aria-label="Collapse sidebar"
              onClick={() => onCollapsedChange(true)}
              className={cn(iconButton, 'ml-auto')}
            >
              <PanelLeftClose />
            </button>
          </div>
          <NavList
            sections={sections}
            activeKey={activeKey}
            className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1"
          />
          <div className="border-border mt-2 border-t pt-3">{userMenu}</div>
        </>
      )}
    </div>
  );
}

// `.rail`: 40px icon button, label as tooltip, pill count on the corner.
function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const pill = item.badge?.tone === 'pill' ? item.badge : undefined;
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Link href={item.href} />}
        aria-label={pill ? `${item.label}, ${pill.label}` : item.label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring relative grid size-10 flex-none place-items-center rounded-[8px] outline-none focus-visible:ring-2',
          active &&
            'bg-sidebar-accent text-accent-ink hover:bg-sidebar-accent hover:text-accent-ink before:bg-accent before:absolute before:inset-y-2.5 before:-left-2 before:w-[3px] before:rounded-r-[3px]'
        )}
      >
        {Icon && <Icon aria-hidden className="size-[18px]" />}
        {pill && (
          <span
            aria-hidden
            data-slot="rail-dot"
            className="bg-accent text-accent-foreground border-sidebar absolute top-[3px] right-px box-content h-4 min-w-4 rounded-full border-2 px-1 text-center font-mono text-[10px] leading-4 font-semibold"
          >
            {badgeText(pill)}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {item.label}
        {item.badge && (
          <span className="font-mono opacity-75">{item.badge.label}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export { AppSidebar };
