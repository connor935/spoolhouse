"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { EditSpoolTypeDialog } from "@/components/edit-spool-type-dialog"
import { Pencil } from "lucide-react"
import type { SpoolType } from "@/lib/db/schema"

export function SpoolTypeCatalogRow({
  spoolType,
  currentUserId,
}: {
  spoolType: SpoolType
  currentUserId: string
}) {
  const [editing, setEditing] = useState(false)
  const canEdit = spoolType.status !== "approved" && spoolType.submittedById === currentUserId

  return (
    <li className="flex items-center justify-between gap-4 px-6 py-3">
      <div className="flex items-center gap-2">
        <span>{spoolType.name}</span>
        {spoolType.status === "pending" && (
          <Badge variant="outline" className="text-muted-foreground">
            Pending review
          </Badge>
        )}
        {spoolType.status === "rejected" && spoolType.submittedById === currentUserId && (
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            Rejected
          </Badge>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>
      <span className="font-mono text-sm tabular-nums text-muted-foreground">
        {spoolType.emptyWeightGrams} g
      </span>
      {canEdit && (
        <EditSpoolTypeDialog spoolType={spoolType} open={editing} onOpenChange={setEditing} />
      )}
    </li>
  )
}
