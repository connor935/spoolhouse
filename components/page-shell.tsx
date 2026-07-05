import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { NotificationBell } from "@/components/notification-bell"
import { getUnreadCount } from "@/app/actions/notifications"

// Shared layout for all sub-pages (everything except the dashboard and the
// join-invite page): single source of truth for container width, back-link
// and title pattern. Async server component — fetches the bell count itself.
export async function PageShell({
  title,
  description,
  backHref = "/",
  backLabel = "Back to dashboard",
  children,
}: {
  title: string
  description?: React.ReactNode
  backHref?: string
  backLabel?: string
  children: React.ReactNode
}) {
  const unreadCount = await getUnreadCount()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <NotificationBell count={unreadCount} />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {children}
    </main>
  )
}
