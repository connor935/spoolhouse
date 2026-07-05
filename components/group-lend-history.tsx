import { Badge } from "@/components/ui/badge"
import type { getGroupLends } from "@/app/actions/lends"

type LendRow = Awaited<ReturnType<typeof getGroupLends>>[number]

export function GroupLendHistory({ lends }: { lends: LendRow[] }) {
  const history = lends.filter((l) => l.lend.status === "returned" || l.lend.status === "declined")

  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No lend history yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {history.map((l) => {
        const when = l.lend.returnedAt ?? l.lend.respondedAt ?? l.lend.requestedAt
        return (
          <li
            key={l.lend.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
          >
            <span>
              <span className="font-medium">{l.borrowerName}</span> borrowed{" "}
              <span className="font-medium">{l.filamentName}</span> from {l.ownerName}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-muted-foreground">
                {l.lend.status === "returned" ? "Returned" : "Declined"}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">{when.toLocaleDateString()}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
