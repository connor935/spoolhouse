"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { EditMaterialDialog } from "@/components/edit-material-dialog"
import { Pencil } from "lucide-react"
import type { Material } from "@/lib/db/schema"

export function MaterialCatalogRow({
  material,
  currentUserId,
}: {
  material: Material
  currentUserId: string
}) {
  const [editing, setEditing] = useState(false)
  const canEdit = material.status !== "approved" && material.submittedById === currentUserId

  return (
    <li className="flex items-center justify-between gap-4 px-6 py-3">
      <div className="flex items-center gap-3">
        <span
          className="h-5 w-5 shrink-0 rounded-full border border-border shadow-inner"
          style={{ backgroundColor: material.color ?? "#94a3b8" }}
          aria-hidden
        />
        <span>{material.name}</span>
        {material.status === "pending" && (
          <Badge variant="outline" className="text-muted-foreground">
            Pending review
          </Badge>
        )}
        {material.status === "rejected" && material.submittedById === currentUserId && (
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
      <Badge variant="secondary" className="shrink-0 font-mono text-xs">
        {material.filamentType}
      </Badge>
      {canEdit && (
        <EditMaterialDialog material={material} open={editing} onOpenChange={setEditing} />
      )}
    </li>
  )
}
