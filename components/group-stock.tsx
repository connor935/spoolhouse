"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { markReturned, requestLend } from "@/app/actions/lends"
import { formatWeight } from "@/lib/filament"
import type { SharedFilament } from "@/lib/sharing"
import { toast } from "sonner"

export function GroupStock({
  groupId,
  filaments,
  currentUserId,
}: {
  groupId: number
  filaments: SharedFilament[]
  currentUserId: string
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<number | null>(null)

  async function handleRequest(filamentId: number) {
    setPendingId(filamentId)
    try {
      await requestLend(filamentId, groupId)
      toast.success("Requested to borrow — waiting for the owner")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not request this spool")
    } finally {
      setPendingId(null)
    }
  }

  async function handleReturn(filamentId: number, lendId: number) {
    setPendingId(filamentId)
    try {
      await markReturned(lendId)
      toast.success("Marked as returned")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not mark this spool returned")
    } finally {
      setPendingId(null)
    }
  }

  if (filaments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
        No spools shared in this group yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {filaments.map((f) => (
        <div key={f.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-border shadow-inner"
              style={{ backgroundColor: f.color ?? "#94a3b8" }}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="truncate font-medium leading-tight">{f.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {f.manufacturer} · {f.spoolTypeLabel}
              </p>
              <p className="text-xs text-muted-foreground">Owner: {f.ownerName}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="font-mono font-semibold">{formatWeight(f.filamentLeftGrams)}</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {f.filamentType}
            </Badge>
          </div>

          {f.ownerId === currentUserId ? (
            f.lentTo ? (
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="border-accent/40 text-accent">
                  Lent to {f.lentTo.borrowerName}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReturn(f.id, f.lentTo!.lendId)}
                  disabled={pendingId === f.id}
                >
                  Mark returned
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="w-fit text-muted-foreground">
                Your spool
              </Badge>
            )
          ) : f.lentTo ? (
            <Badge variant="outline" className="w-fit border-accent/40 text-accent">
              Lent to {f.lentTo.borrowerId === currentUserId ? "you" : f.lentTo.borrowerName}
            </Badge>
          ) : (
            <Button size="sm" onClick={() => handleRequest(f.id)} disabled={pendingId === f.id}>
              {pendingId === f.id ? "Requesting…" : "Request to borrow"}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
