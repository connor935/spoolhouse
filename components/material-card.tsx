"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { MoreVertical, Pencil, Plus, Scale, Trash2, Check, X } from "lucide-react"
import { deleteSpool, setMeasuredWeight } from "@/app/actions/filaments"
import { computeFilamentLeft, formatWeight, type MaterialInventory, type SpoolView } from "@/lib/filament"
import { toast } from "sonner"

function SpoolRow({
  spool,
  index,
  onEdit,
}: {
  spool: SpoolView
  index: number
  onEdit: (s: SpoolView) => void
}) {
  const [adjusting, setAdjusting] = useState(false)
  const [value, setValue] = useState(String(spool.measuredTotalWeightGrams))
  const [pending, setPending] = useState(false)

  const measured = Number.parseInt(value, 10)
  const previewLeft = !Number.isNaN(measured)
    ? computeFilamentLeft(measured, spool.emptyWeightGrams)
    : null

  const barColor = spool.isEmpty
    ? "bg-muted-foreground/30"
    : spool.isLow
      ? "bg-destructive"
      : "bg-accent"

  async function saveWeight() {
    const mtw = Number.parseInt(value, 10)
    if (Number.isNaN(mtw) || mtw < spool.emptyWeightGrams) {
      toast.error(`Measured weight can't be less than the empty spool weight (${spool.emptyWeightGrams} g)`)
      return
    }
    setPending(true)
    try {
      await setMeasuredWeight(spool.id, mtw)
      toast.success("Weight updated")
      setAdjusting(false)
    } catch {
      toast.error("Could not update weight")
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    setPending(true)
    try {
      await deleteSpool(spool.id)
      toast.success("Spool removed")
    } catch {
      toast.error("Could not remove spool")
      setPending(false)
    }
  }

  return (
    <li className="flex flex-col gap-2 px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
          <span className="truncate text-xs text-muted-foreground">{spool.spoolTypeLabel}</span>
          {spool.isEmpty ? (
            <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
              Empty
            </Badge>
          ) : spool.isLow ? (
            <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">Low</Badge>
          ) : null}
          {spool.lentToName && (
            <Badge variant="outline" className="border-accent/40 text-accent">
              Lent to {spool.lentToName}
            </Badge>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!adjusting && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-muted-foreground"
              onClick={() => {
                setValue(String(spool.measuredTotalWeightGrams))
                setAdjusting(true)
              }}
            >
              <Scale className="mr-1 h-3.5 w-3.5" />
              Re-weigh
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Spool actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(spool)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit spool
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={pending}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete spool
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 font-mono text-sm font-semibold tabular-nums">
          {formatWeight(spool.filamentLeftGrams)}
        </span>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={Math.round(spool.percentLeft)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${spool.percentLeft}%` }}
          />
        </div>
        <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
          {Math.round(spool.percentLeft)}%
        </span>
      </div>

      {adjusting && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="1"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9 max-w-40 font-mono"
              aria-label="Measured total weight in grams"
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={saveWeight} disabled={pending}>
              <Check className="h-4 w-4" />
              <span className="sr-only">Save</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0"
              onClick={() => setAdjusting(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            {previewLeft !== null ? `= ${formatWeight(previewLeft)} filament left` : "Enter the scale value (g)"}
          </span>
        </div>
      )}
    </li>
  )
}

export function MaterialCard({
  inventory,
  visibleSpoolIds,
  onEditSpool,
  onAddSpool,
}: {
  inventory: MaterialInventory
  // Tab filtering: only these spools are listed (indices stay material-wide)
  visibleSpoolIds: Set<number>
  onEditSpool: (s: SpoolView) => void
  onAddSpool: (materialId: number) => void
}) {
  const { material, spools, totalLeftGrams } = inventory
  const swatch = material.color ?? "#94a3b8"

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card transition-colors hover:border-accent/40">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 h-9 w-9 shrink-0 rounded-full border border-border shadow-inner"
            style={{ backgroundColor: swatch }}
            aria-hidden
          />
          <div className="min-w-0">
            <h3 className="truncate font-medium leading-tight text-card-foreground">{material.name}</h3>
            <p className="truncate text-sm text-muted-foreground">{material.manufacturer}</p>
            <p className="text-xs text-muted-foreground/80">
              {spools.length} spool{spools.length === 1 ? "" : "s"} · {formatWeight(totalLeftGrams)} left
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {material.filamentType}
          </Badge>
          {material.status === "pending" && (
            <Badge variant="outline" className="text-muted-foreground">
              Pending review
            </Badge>
          )}
        </div>
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {spools.map((s, i) =>
          visibleSpoolIds.has(s.id) ? <SpoolRow key={s.id} spool={s} index={i} onEdit={onEditSpool} /> : null,
        )}
      </ul>

      <button
        type="button"
        onClick={() => onAddSpool(material.id)}
        className="flex items-center justify-center gap-1.5 rounded-b-lg border-t border-border py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        Add spool of this material
      </button>
    </div>
  )
}
