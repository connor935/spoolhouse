"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createFilament, updateFilament } from "@/app/actions/filaments"
import { FILAMENT_TYPES, computeFilamentLeft, formatKg, type FilamentView } from "@/lib/filament"
import { toast } from "sonner"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  filament?: FilamentView | null
}

export function SpoolFormDialog({ open, onOpenChange, filament }: Props) {
  const editing = Boolean(filament)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(filament?.name ?? "")
  const [manufacturer, setManufacturer] = useState(filament?.manufacturer ?? "")
  const [filamentType, setFilamentType] = useState(filament?.filamentType ?? "PLA")
  const [color, setColor] = useState(filament?.color ?? "#1c7ed6")
  const [emptySpoolWeight, setEmptySpoolWeight] = useState(
    filament ? String(filament.emptySpoolWeight) : "0.2",
  )
  const [fullFilamentWeight, setFullFilamentWeight] = useState(
    filament ? String(filament.fullFilamentWeight) : "1",
  )
  const [measuredTotalWeight, setMeasuredTotalWeight] = useState(
    filament ? String(filament.measuredTotalWeight) : "1.2",
  )

  // Live computed preview of how much filament is actually left
  const esw = Number.parseFloat(emptySpoolWeight)
  const mtw = Number.parseFloat(measuredTotalWeight)
  const previewLeft =
    !Number.isNaN(esw) && !Number.isNaN(mtw) ? computeFilamentLeft(mtw, esw) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const empty = Number.parseFloat(emptySpoolWeight)
    const full = Number.parseFloat(fullFilamentWeight)
    const measured = Number.parseFloat(measuredTotalWeight)

    if (!name.trim() || !manufacturer.trim()) {
      toast.error("Name and manufacturer are required")
      return
    }
    if (Number.isNaN(empty) || empty <= 0) {
      toast.error("Empty spool weight must be greater than 0")
      return
    }
    if (Number.isNaN(full) || full <= 0) {
      toast.error("Full filament weight must be greater than 0")
      return
    }
    if (Number.isNaN(measured) || measured < 0) {
      toast.error("Measured weight must be 0 or more")
      return
    }
    if (measured < empty - 0.001) {
      toast.error("Measured weight can't be less than the empty spool weight")
      return
    }

    const payload = {
      name: name.trim(),
      manufacturer: manufacturer.trim(),
      filamentType,
      color,
      emptySpoolWeight: empty,
      fullFilamentWeight: full,
      measuredTotalWeight: measured,
    }

    try {
      setSaving(true)
      if (editing && filament) {
        await updateFilament(filament.id, payload)
        toast.success("Spool updated")
      } else {
        await createFilament(payload)
        toast.success("Spool added to warehouse")
      }
      onOpenChange(false)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit spool" : "Add new spool"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details for this filament spool."
              : "Register a new filament spool. Remaining filament is calculated from the weighed total."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Galaxy Black"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              id="manufacturer"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="e.g. Prusament"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={filamentType} onValueChange={(value) => value && setFilamentType(value)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILAMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
                  aria-label="Spool color"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="emptySpoolWeight">Empty spool weight (kg)</Label>
              <Input
                id="emptySpoolWeight"
                type="number"
                step="0.001"
                min="0"
                value={emptySpoolWeight}
                onChange={(e) => setEmptySpoolWeight(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Weight of the bare, empty spool.</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="fullFilamentWeight">Full filament weight (kg)</Label>
              <Input
                id="fullFilamentWeight"
                type="number"
                step="0.001"
                min="0"
                value={fullFilamentWeight}
                onChange={(e) => setFullFilamentWeight(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Filament on a new spool, e.g. 1 kg.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="measuredTotalWeight">Measured total weight (kg)</Label>
            <Input
              id="measuredTotalWeight"
              type="number"
              step="0.001"
              min="0"
              value={measuredTotalWeight}
              onChange={(e) => setMeasuredTotalWeight(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Put the whole spool on a scale and enter the value.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">Calculated filament left</span>
            <span className="font-mono text-lg font-semibold tabular-nums text-card-foreground">
              {previewLeft !== null ? formatKg(previewLeft) : "—"}
            </span>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add spool"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
