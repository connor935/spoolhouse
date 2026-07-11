"use client";

import { Button } from "@/components/ui/button";
import { Plus, Boxes, Disc3, UsersRound } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";
import Link from "next/link";

export function AppHeader({
  unreadCount,
  user,
}: {
  unreadCount: number;
  user: { name: string; isAdmin: boolean };
}) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl gap-4 px-4 py-6 sm:items-center justify-between md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight tracking-tight">
              Spoolhouse
            </h1>
            <p className="hidden md:block text-sm text-muted-foreground">
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
