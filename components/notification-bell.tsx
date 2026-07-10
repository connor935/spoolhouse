import Link from "next/link"
import { Bell } from "lucide-react"

// Presentational — count is fetched server-side (PageShell / app/page.tsx)
export function NotificationBell({ count }: { count: number }) {
  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      aria-label={count > 0 ? `Notifications (${count} unread)` : "Notifications"}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-semibold text-accent-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  )
}
