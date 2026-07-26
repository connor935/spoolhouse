'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CircleUser,
  Disc3,
  Layers,
  ListChecks,
  LogOut,
  Monitor,
  Moon,
  Settings,
  SlidersHorizontal,
  Sun,
  Users,
  UsersRound,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { authClient } from '@/lib/auth-client';

export function UserMenu({
  name,
  isAdmin,
}: {
  name: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  async function signOut() {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-ring inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors outline-none focus-visible:ring-2">
        <CircleUser className="h-5 w-5" />
        <span className="hidden sm:inline">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{name}</DropdownMenuLabel>
          <DropdownMenuItem render={<Link href="/account" />}>
            <Settings className="mr-2 h-4 w-4" />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/materials" />}>
            <Layers className="mr-2 h-4 w-4" />
            Materials
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/spool-types" />}>
            <Disc3 className="mr-2 h-4 w-4" />
            Spool catalog
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/groups" />}>
            <UsersRound className="mr-2 h-4 w-4" />
            Groups
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Admin</DropdownMenuLabel>
              <DropdownMenuItem render={<Link href="/admin/users" />}>
                <Users className="mr-2 h-4 w-4" />
                Manage users
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/admin/materials" />}>
                <ListChecks className="mr-2 h-4 w-4" />
                Review materials
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/admin/spool-types" />}>
                <ListChecks className="mr-2 h-4 w-4" />
                Review spool types
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/admin/properties" />}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Properties
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as string)}
        >
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
