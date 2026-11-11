'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  badgeText,
  type NavBadge as NavBadgeData,
  type NavItem,
  type NavSection,
} from '@/lib/nav';
import { cn } from '@/lib/utils';

type Size = 'default' | 'lg';

/**
 * Count next to a nav label. `pill` (accent) when something waits for the
 * user, `count` (muted mono) for plain totals. The number is decorative; the
 * screen-reader text carries the meaning ("Borrows, 1 open request").
 */
function NavBadge({
  badge,
  className,
}: {
  badge: NavBadgeData;
  className?: string;
}) {
  return (
    <>
      <span
        aria-hidden
        data-slot="nav-badge"
        data-tone={badge.tone}
        className={cn(
          'ml-auto font-mono',
          badge.tone === 'pill'
            ? 'bg-accent text-accent-foreground h-5 min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold'
            : 'text-muted-foreground text-xs leading-none font-medium',
          className
        )}
      >
        {badgeText(badge)}
      </span>
      <span className="sr-only">, {badge.label}</span>
    </>
  );
}

const itemClass = (size: Size, sub: boolean, active: boolean) =>
  cn(
    // `.nav`: 36px rows (44 in the drawer), 3px accent bar when active.
    'text-foreground focus-visible:ring-ring relative flex w-full items-center rounded-[8px] outline-none focus-visible:ring-2',
    'hover:bg-muted [&_svg]:text-muted-foreground [&_svg]:size-[18px] [&_svg]:flex-none',
    size === 'lg'
      ? cn('gap-3 px-3', sub ? 'h-10 text-sm' : 'h-11 text-[15px]')
      : cn('gap-2.5 px-2.5', sub ? 'h-8 text-[13px]' : 'h-9 text-sm'),
    active &&
      cn(
        'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent font-semibold [&_svg]:text-accent',
        'before:bg-accent before:absolute before:left-0 before:w-[3px] before:rounded-r-[3px]',
        size === 'lg' ? 'before:inset-y-2.5' : 'before:inset-y-2'
      )
  );

function NavLink({
  item,
  active,
  size,
  sub = false,
  onNavigate,
  className,
}: {
  item: NavItem;
  active: boolean;
  size: Size;
  sub?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(itemClass(size, sub, active), className)}
    >
      {Icon && <Icon aria-hidden />}
      <span className="min-w-0 truncate">{item.label}</span>
      {item.badge && <NavBadge badge={item.badge} />}
    </Link>
  );
}

function NavItemWithChildren({
  item,
  activeKey,
  size,
  onNavigate,
}: {
  item: NavItem;
  activeKey: string | null;
  size: Size;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="relative">
        <NavLink
          item={item}
          active={activeKey === item.key}
          size={size}
          onNavigate={onNavigate}
          className="pr-10"
        />
        <CollapsibleTrigger
          aria-label={`${open ? 'Hide' : 'Show'} ${item.label.toLowerCase()}`}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1 grid size-7 -translate-y-1/2 place-items-center rounded-[6px] outline-none focus-visible:ring-2"
        >
          <ChevronDown
            aria-hidden
            className={cn('size-4 transition-transform', !open && '-rotate-90')}
          />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <ul className="border-border mt-0.5 ml-[18px] flex flex-col gap-0.5 border-l pl-2">
          {item.children!.map((child) => (
            <li key={child.key}>
              <NavLink
                item={child}
                active={activeKey === child.key}
                size={size}
                sub
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Expanded navigation list: the 240px sidebar and the mobile drawer
// (Nav.dc.html, MobileDrawer.dc.html). One <nav> landmark per section.
function NavList({
  sections,
  activeKey,
  size = 'default',
  onNavigate,
  className,
}: {
  sections: NavSection[];
  activeKey: string | null;
  size?: Size;
  /** Called when a link is followed, e.g. to close the drawer. */
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <div data-slot="nav-list" className={cn('flex flex-col', className)}>
      {sections.map((section) => (
        <nav
          key={section.key}
          aria-label={section.label ?? 'Main'}
          className="flex flex-col"
        >
          {section.label && (
            <div
              aria-hidden
              className={cn(
                'text-muted-foreground pb-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase',
                size === 'lg' ? 'px-3 pt-4' : 'px-2.5 pt-[18px]'
              )}
            >
              {section.label}
            </div>
          )}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.key}>
                {item.children?.length ? (
                  <NavItemWithChildren
                    item={item}
                    activeKey={activeKey}
                    size={size}
                    onNavigate={onNavigate}
                  />
                ) : (
                  <NavLink
                    item={item}
                    active={activeKey === item.key}
                    size={size}
                    onNavigate={onNavigate}
                  />
                )}
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </div>
  );
}

export { NavList, NavBadge };
