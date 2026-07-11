'use client';

import { Boxes } from 'lucide-react';
import { NotificationBell } from '@/components/notification-bell';
import { UserMenu } from '@/components/user-menu';

export function AppHeader({
  unreadCount,
  user,
}: {
  unreadCount: number;
  user: { name: string; isAdmin: boolean };
}) {
  return (
    <header className="border-border bg-card border-b">
      <div className="mx-auto flex max-w-7xl justify-between gap-4 px-4 py-6 sm:items-center md:px-6">
        <div className="flex items-center gap-3">
          <div className="bg-accent text-accent-foreground flex h-10 w-10 items-center justify-center rounded-md">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl leading-tight font-semibold tracking-tight">
              Spoolhouse
            </h1>
            <p className="text-muted-foreground hidden text-sm md:block">
              Filament warehouse management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell count={unreadCount} />
          <UserMenu name={user.name} isAdmin={user.isAdmin} />
        </div>
      </div>
    </header>
  );
}
