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
import { Label } from "@/components/ui/label"
import { MoreVertical, Pencil, Trash2, Check, X } from "lucide-react"
import { deleteFilament, setMeasuredWeight } from "@/app/actions/filaments"
import { computeFilamentLeft, formatWeight, type FilamentView } from "@/lib/filament"
import { toast } from "sonner"

type Props = {
  filament: FilamentView
  onEdit: (f: FilamentView) => void
}

export function SpoolCard({ filament, onEdit }: Props) {
  const [adjusting, setAdjusting] = useState(false)
  const [value, setValue] = useState(String(filament.measuredTotalWeightGrams))
  const [pending, setPending] = useState(false)

  const swatch = filament.color ?? "#94a3b8"

  // Live preview while re-weighing
  const measured = Number.parseInt(value, 10)
  const previewLeft = !Number.isNaN(measured)
    ? computeFilamentLeft(measured, filament.emptyWeightGrams)
    : null

  async function handleDelete() {
    setPending(true)
    try {
      await deleteFilament(filament.id)
      toast.success("Spool removed")
    } catch {
      toast.error("Could not remove spool")
      setPending(false)
    }
  }

  async function handleSaveWeight() {
    const mtw = Number.parseInt(value, 10)
    if (Number.isNaN(mtw) || mtw < filament.emptyWeightGrams) {
      toast.error(
        `Measured weight can't be less than the empty spool weight (${filament.emptyWeightGrams} g)`,
      )
      return
    }
    setPending(true)
    try {
      await setMeasuredWeight(filament.id, mtw)
      toast.success("Weight updated")
      setAdjusting(false)
    } catch {
      toast.error("Could not update weight")
    } finally {
      setPending(false)
    }
  }

  const barColor = filament.isEmpty
    ? "bg-muted-foreground/30"
    : filament.isLow
      ? "bg-destructive"
      : "bg-accent"

  return (
    <div className="group flex flex-col gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 h-9 w-9 shrink-0 rounded-full border border-border shadow-inner"
            style={{ backgroundColor: swatch }}
            aria-hidden
          />
          <div className="min-w-0">
            <h3 className="truncate font-medium leading-tight text-card-foreground">{filament.name}</h3>
            <p className="truncate text-sm text-muted-foreground">{filament.manufacturer}</p>
            <p className="truncate text-xs text-muted-foreground/80">{filament.spoolTypeLabel}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Spool actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(filament)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={pending}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete spool
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs">
          {filament.filamentType}
        </Badge>
        {filament.isEmpty ? (
          <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
            Empty
          </Badge>
        ) : filament.isLow ? (
          <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive">Low</Badge>
        ) : (
          <Badge className="bg-accent text-accent-foreground hover:bg-accent">In stock</Badge>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <span className="font-mono text-2xl font-semibold tabular-nums text-card-foreground">
            {formatWeight(filament.filamentLeftGrams)}
          </span>
          <span className="text-sm text-muted-foreground">
            of {formatWeight(filament.fullFilamentWeightGrams)}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={Math.round(filament.percentLeft)} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${filament.percentLeft}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{Math.round(filament.percentLeft)}% remaining</span>
          <span className="font-mono">Weighed {formatWeight(filament.measuredTotalWeightGrams)}</span>
        </div>
      </div>

      {adjusting ? (
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Measured total weight (g)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="1"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9 font-mono"
              aria-label="Measured total weight in grams"
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSaveWeight} disabled={pending}>
              <Check className="h-4 w-4" />
              <span className="sr-only">Save</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0"
              onClick={() => {
                setValue(String(filament.measuredTotalWeightGrams))
                setAdjusting(false)
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            {previewLeft !== null ? `= ${formatWeight(previewLeft)} filament left` : "Enter the scale value"}
          </span>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={() => setAdjusting(true)}>
          Re-weigh spool
        </Button>
      )}
    </div>
  )
}
