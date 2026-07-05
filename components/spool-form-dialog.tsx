"use client"

import type React from "react"

import { useMemo, useState } from "react"
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
import { Plus, X } from "lucide-react"
import { createFilament, updateFilament } from "@/app/actions/filaments"
import { requestSpoolType } from "@/app/actions/spool-types"
import {
  FILAMENT_TYPES,
  computeFilamentLeft,
  formatWeight,
  spoolTypeLabel,
  type FilamentView,
} from "@/lib/filament"
import type { SpoolType } from "@/lib/db/schema"
import { toast } from "sonner"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  filament?: FilamentView | null
  spoolTypes: SpoolType[]
}

export function SpoolFormDialog({ open, onOpenChange, filament, spoolTypes }: Props) {
  const editing = Boolean(filament)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(filament?.name ?? "")
  const [manufacturer, setManufacturer] = useState(filament?.manufacturer ?? "")
  const [filamentType, setFilamentType] = useState(filament?.filamentType ?? "PLA")
  const [color, setColor] = useState(filament?.color ?? "#1c7ed6")
  const [spoolTypeId, setSpoolTypeId] = useState<string | null>(
    filament ? String(filament.spoolTypeId) : null,
  )
  const [fullGrams, setFullGrams] = useState(
    filament ? String(filament.fullFilamentWeightGrams) : "1000",
  )
  const [measuredGrams, setMeasuredGrams] = useState(
    filament ? String(filament.measuredTotalWeightGrams) : "1200",
  )

  // Spool types requested from within this dialog (immediately usable)
  const [extraTypes, setExtraTypes] = useState<SpoolType[]>([])
  const allTypes = useMemo(() => {
    const seen = new Set(spoolTypes.map((t) => t.id))
    return [...spoolTypes, ...extraTypes.filter((t) => !seen.has(t.id))]
  }, [spoolTypes, extraTypes])

  // Base UI's Select.Value renders the raw value unless the root gets an
  // items map (value -> label) to resolve the display text from.
  const selectItems = useMemo(
    () =>
      allTypes.map((t) => ({
        value: String(t.id),
        label: `${spoolTypeLabel(t)}${t.status === "pending" ? " — pending" : ""}`,
      })),
    [allTypes],
  )

  // Inline "request new spool type" mini-form
  const [requesting, setRequesting] = useState(false)
  const [reqManufacturer, setReqManufacturer] = useState("")
  const [reqName, setReqName] = useState("")
  const [reqGrams, setReqGrams] = useState("")
  const [reqPending, setReqPending] = useState(false)

  const selectedType = allTypes.find((t) => String(t.id) === spoolTypeId) ?? null

  // Live computed preview of how much filament is actually left
  const measured = Number.parseInt(measuredGrams, 10)
  const previewLeft =
    selectedType && !Number.isNaN(measured)
      ? computeFilamentLeft(measured, selectedType.emptyWeightGrams)
      : null

  async function handleRequestSpoolType() {
    const grams = Number.parseInt(reqGrams, 10)
    if (!reqManufacturer.trim() || !reqName.trim()) {
      toast.error("Manufacturer and name are required")
      return
    }
    if (Number.isNaN(grams) || grams <= 0) {
      toast.error("Empty spool weight must be greater than 0 g")
      return
    }
    try {
      setReqPending(true)
      const created = await requestSpoolType({
        manufacturer: reqManufacturer.trim(),
        name: reqName.trim(),
        emptyWeightGrams: grams,
      })
      setExtraTypes((prev) => [...prev, created])
      setSpoolTypeId(String(created.id))
      setRequesting(false)
      setReqManufacturer("")
      setReqName("")
      setReqGrams("")
      toast.success("Spool type requested — you can use it right away")
    } catch {
      toast.error("Could not request spool type")
    } finally {
      setReqPending(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const full = Number.parseInt(fullGrams, 10)
    const measuredTotal = Number.parseInt(measuredGrams, 10)

    if (!name.trim() || !manufacturer.trim()) {
      toast.error("Name and manufacturer are required")
      return
    }
    if (!selectedType) {
      toast.error("Pick a spool type (or request a new one)")
      return
    }
    if (Number.isNaN(full) || full <= 0) {
      toast.error("Full filament weight must be greater than 0 g")
      return
    }
    if (Number.isNaN(measuredTotal) || measuredTotal < 0) {
      toast.error("Measured weight must be 0 g or more")
      return
    }
    if (measuredTotal < selectedType.emptyWeightGrams) {
      toast.error("Measured weight can't be less than the empty spool weight")
      return
    }

    const payload = {
      name: name.trim(),
      manufacturer: manufacturer.trim(),
      filamentType,
      color,
      spoolTypeId: selectedType.id,
      fullFilamentWeightGrams: full,
      measuredTotalWeightGrams: measuredTotal,
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="spoolType">Spool type</Label>
              {!requesting && (
                <button
                  type="button"
                  onClick={() => {
                    setRequesting(true)
                    setReqManufacturer(manufacturer)
                  }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Request new
                </button>
              )}
            </div>
            <Select
              items={selectItems}
              value={spoolTypeId}
              onValueChange={(value) => value && setSpoolTypeId(value)}
            >
              <SelectTrigger id="spoolType" className="w-full">
                <SelectValue placeholder="Pick a spool type" />
              </SelectTrigger>
              <SelectContent>
                {selectItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines the empty spool weight
              {selectedType ? `: ${selectedType.emptyWeightGrams} g` : "."}
            </p>
          </div>

          {requesting && (
            <div className="flex flex-col gap-3 rounded-md border border-border bg-secondary/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Request new spool type</span>
                <button
                  type="button"
                  onClick={() => setRequesting(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close request form"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reqManufacturer" className="text-xs">
                    Manufacturer
                  </Label>
                  <Input
                    id="reqManufacturer"
                    value={reqManufacturer}
                    onChange={(e) => setReqManufacturer(e.target.value)}
                    placeholder="e.g. Prusament"
                    className="h-8"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reqName" className="text-xs">
                    Spool name
                  </Label>
                  <Input
                    id="reqName"
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    placeholder="e.g. Cardboard 1kg"
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="reqGrams" className="text-xs">
                    Empty spool weight (g)
                  </Label>
                  <Input
                    id="reqGrams"
                    type="number"
                    step="1"
                    min="1"
                    value={reqGrams}
                    onChange={(e) => setReqGrams(e.target.value)}
                    className="h-8"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleRequestSpoolType}
                  disabled={reqPending}
                >
                  {reqPending ? "Requesting…" : "Request"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                You can use it immediately; an admin will review it for the global catalog.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullFilamentWeight">Full filament weight (g)</Label>
              <Input
                id="fullFilamentWeight"
                type="number"
                step="1"
                min="0"
                value={fullGrams}
                onChange={(e) => setFullGrams(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Filament on a new spool, e.g. 1000 g.</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="measuredTotalWeight">Measured total weight (g)</Label>
              <Input
                id="measuredTotalWeight"
                type="number"
                step="1"
                min="0"
                value={measuredGrams}
                onChange={(e) => setMeasuredGrams(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Put the whole spool on a scale and enter the value.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">Calculated filament left</span>
            <span className="font-mono text-lg font-semibold tabular-nums text-card-foreground">
              {previewLeft !== null ? formatWeight(previewLeft) : "—"}
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
