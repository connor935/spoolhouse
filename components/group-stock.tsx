"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cancelLendRequest, markReturned, requestLend } from "@/app/actions/lends"
import { formatWeight } from "@/lib/filament"
import type { SharedSpool } from "@/lib/sharing"
import { toast } from "sonner"

// Pooled group stock, grouped by (global) material so it's visible when
// several members have the same material. Lending stays per physical spool.
export function GroupStock({
  groupId,
  spools,
  currentUserId,
}: {
  groupId: number
  spools: SharedSpool[]
  currentUserId: string
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<number | null>(null)

  const byMaterial = useMemo(() => {
    const map = new Map<number, { material: SharedSpool["material"]; spools: SharedSpool[] }>()
    for (const s of spools) {
      const entry = map.get(s.material.id) ?? { material: s.material, spools: [] }
      entry.spools.push(s)
      map.set(s.material.id, entry)
    }
    return [...map.values()].sort((a, b) =>
      `${a.material.manufacturer} ${a.material.name}`.localeCompare(
        `${b.material.manufacturer} ${b.material.name}`,
      ),
    )
  }, [spools])

  async function run(spoolId: number, fn: () => Promise<void>, success: string) {
    setPendingId(spoolId)
    try {
      await fn()
      toast.success(success)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    } finally {
      setPendingId(null)
    }
  }

  if (spools.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
        No spools shared in this group yet.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {byMaterial.map(({ material, spools: materialSpools }) => (
        <div key={material.id} className="flex flex-col rounded-lg border border-border bg-card">
          <div className="flex items-start justify-between gap-3 p-4 pb-2">
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-border shadow-inner"
                style={{ backgroundColor: material.color ?? "#94a3b8" }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="truncate font-medium leading-tight">{material.name}</p>
                <p className="truncate text-xs text-muted-foreground">{material.manufacturer}</p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 font-mono text-xs">
              {material.filamentType}
            </Badge>
          </div>

          <ul className="divide-y divide-border border-t border-border">
            {materialSpools.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-muted-foreground">
                    {s.ownerId === currentUserId ? "Your spool" : s.ownerName}
                  </span>
                  <span className="shrink-0 font-mono font-semibold">
                    {formatWeight(s.filamentLeftGrams)}
                  </span>
                </div>

                {s.ownerId === currentUserId ? (
                  s.lentTo ? (
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="border-accent/40 text-accent">
                        Lent to {s.lentTo.borrowerName}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          run(s.id, () => markReturned(s.lentTo!.lendId), "Marked as returned")
                        }
                        disabled={pendingId === s.id}
                      >
                        Mark returned
                      </Button>
                    </div>
                  ) : s.pendingRequest ? (
                    <Badge variant="outline" className="w-fit border-accent/40 text-accent">
                      Requested by {s.pendingRequest.borrowerName}
                    </Badge>
                  ) : null
                ) : s.lentTo ? (
                  <Badge variant="outline" className="w-fit border-accent/40 text-accent">
                    Lent to {s.lentTo.borrowerId === currentUserId ? "you" : s.lentTo.borrowerName}
                  </Badge>
                ) : s.pendingRequest ? (
                  s.pendingRequest.borrowerId === currentUserId ? (
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="border-accent/40 text-accent">
                        Requested — awaiting approval
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          run(
                            s.id,
                            () => cancelLendRequest(s.pendingRequest!.lendId),
                            "Request cancelled",
                          )
                        }
                        disabled={pendingId === s.id}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="outline" className="w-fit text-muted-foreground">
                      Requested
                    </Badge>
                  )
                ) : (
                  <Button
                    size="sm"
                    className="self-start"
                    onClick={() =>
                      run(
                        s.id,
                        () => requestLend(s.id, groupId),
                        "Requested to borrow — waiting for the owner",
                      )
                    }
                    disabled={pendingId === s.id}
                  >
                    {pendingId === s.id ? "Requesting…" : "Request to borrow"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
