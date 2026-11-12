'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ChevronsUpDown,
  CircleUserRound,
  LogOut,
  Settings,
} from 'lucide-react';

import {
  ThemeSwitch,
  type ThemeChoice,
} from '@/components/layout/theme-switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type UserMenuProps = {
  user: { name: string; isAdmin: boolean };
  theme: string | undefined;
  onThemeChange: (theme: ThemeChoice) => void;
  onSignOut: () => void;
  /** Rail variant: a 40px icon button instead of the name row. */
  collapsed?: boolean;
  /** The account page is open — the trigger gets the active style. */
  active?: boolean;
  defaultOpen?: boolean;
};

const menuRow =
  'text-foreground hover:bg-muted focus-visible:ring-ring flex h-[34px] w-full items-center gap-2.5 rounded-[6px] px-2 text-left text-sm outline-none focus-visible:ring-2 [&_svg]:text-muted-foreground [&_svg]:size-4';

// Sidebar footer menu (Sidebar.dc.html, "user menu open"): name + role,
// Account, theme switch, sign out. A popover rather than a menu, because the
// theme switch is a toggle group that needs ordinary Tab navigation.
function UserMenu({
  user,
  theme,
  onThemeChange,
  onSignOut,
  collapsed = false,
  active = false,
  defaultOpen,
}: UserMenuProps) {
  const role = user.isAdmin ? 'Admin' : 'Member';
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      {collapsed ? (
        <PopoverTrigger
          aria-label="User menu"
          className={cn(
            'text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-10 place-items-center rounded-[8px] outline-none focus-visible:ring-2',
            active && 'bg-sidebar-accent text-accent'
          )}
        >
          <CircleUserRound className="size-[18px]" />
        </PopoverTrigger>
      ) : (
        <PopoverTrigger
          className={cn(
            'hover:bg-muted focus-visible:ring-ring data-popup-open:bg-muted flex h-11 w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-sm outline-none focus-visible:ring-2',
            active && 'bg-sidebar-accent text-sidebar-accent-foreground'
          )}
        >
          <CircleUserRound
            aria-hidden
            className={cn(
              'size-[18px] flex-none',
              active ? 'text-accent' : 'text-muted-foreground'
            )}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="truncate font-medium">{user.name}</span>
            <span className="text-muted-foreground text-xs">{role}</span>
          </span>
          <ChevronsUpDown
            aria-hidden
            className="text-muted-foreground size-4 flex-none"
          />
        </PopoverTrigger>
      )}
      <PopoverContent
        side={collapsed ? 'right' : 'top'}
        align={collapsed ? 'end' : 'start'}
        sideOffset={8}
        aria-label="User menu"
        className={cn(
          'gap-0 p-1.5',
          collapsed ? 'w-[216px]' : 'w-(--anchor-width)'
        )}
      >
        <div className="px-2 pt-1.5 pb-2">
          <div className="truncate font-semibold">{user.name}</div>
          <div className="text-muted-foreground text-xs">{role}</div>
        </div>
        <div className="bg-border -mx-1.5 my-1 h-px" />
        {/* A real link, not PopoverClose: that renders role="button". */}
        <Link
          href="/account"
          onClick={() => setOpen(false)}
          className={menuRow}
        >
          <Settings aria-hidden />
          Account
        </Link>
        <div className="flex flex-col gap-1.5 px-2 pt-2 pb-1.5">
          <span className="text-muted-foreground text-xs">Theme</span>
          <ThemeSwitch value={theme} onValueChange={onThemeChange} />
        </div>
        <div className="bg-border -mx-1.5 my-1 h-px" />
        <button type="button" onClick={onSignOut} className={menuRow}>
          <LogOut aria-hidden />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}

export { UserMenu };
