"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { approveLend, declineLend, type getGroupLends } from "@/app/actions/lends"
import { toast } from "sonner"

type LendRow = Awaited<ReturnType<typeof getGroupLends>>[number]

export function GroupLendRequests({ lends, currentUserId }: { lends: LendRow[]; currentUserId: string }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<number | null>(null)

  const incoming = lends.filter((l) => l.lend.status === "requested" && l.ownerId === currentUserId)
  const outgoing = lends.filter(
    (l) => l.lend.borrowerId === currentUserId && (l.lend.status === "requested" || l.lend.status === "active"),
  )

  async function handle(action: () => Promise<void>, id: number, successMsg: string) {
    setPendingId(id)
    try {
      await action()
      toast.success(successMsg)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">Incoming requests</h3>
        {incoming.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No pending requests on your spools.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {incoming.map((l) => (
              <li
                key={l.lend.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <span className="text-sm">
                  <span className="font-medium">{l.borrowerName}</span> wants to borrow{" "}
                  <span className="font-medium">{l.filamentName}</span>
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={pendingId === l.lend.id}
                    onClick={() => handle(() => approveLend(l.lend.id), l.lend.id, "Lend approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pendingId === l.lend.id}
                    onClick={() => handle(() => declineLend(l.lend.id), l.lend.id, "Lend declined")}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted-foreground">Your requests</h3>
        {outgoing.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">You haven&apos;t requested to borrow anything here.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {outgoing.map((l) => (
              <li
                key={l.lend.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <span className="text-sm">
                  <span className="font-medium">{l.filamentName}</span> from {l.ownerName}
                </span>
                <Badge
                  variant="outline"
                  className={l.lend.status === "active" ? "border-accent/40 text-accent" : "text-muted-foreground"}
                >
                  {l.lend.status === "active" ? "Active" : "Pending"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
