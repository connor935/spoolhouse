"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
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
import { createSpool, updateSpool } from "@/app/actions/filaments"
import { requestMaterial } from "@/app/actions/materials"
import { requestSpoolType } from "@/app/actions/spool-types"
import {
  FILAMENT_TYPES,
  computeFilamentLeft,
  formatWeight,
  materialLabel,
  spoolTypeLabel,
  type SpoolView,
} from "@/lib/filament"
import type { Material, SpoolType } from "@/lib/db/schema"
import { toast } from "sonner"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  spool?: SpoolView | null
  // Preselect a material ("Add spool of this material" on a MaterialCard)
  presetMaterialId?: number | null
  materials: Material[]
  spoolTypes: SpoolType[]
}

export function SpoolFormDialog({
  open,
  onOpenChange,
  spool,
  presetMaterialId,
  materials,
  spoolTypes,
}: Props) {
  const editing = Boolean(spool)
  const [saving, setSaving] = useState(false)
  const [materialId, setMaterialId] = useState<string | null>(
    spool ? String(spool.materialId) : presetMaterialId ? String(presetMaterialId) : null,
  )
  const [spoolTypeId, setSpoolTypeId] = useState<string | null>(
    spool ? String(spool.spoolTypeId) : null,
  )
  const [fullGrams, setFullGrams] = useState(spool ? String(spool.fullFilamentWeightGrams) : "1000")
  const [measuredGrams, setMeasuredGrams] = useState(
    spool ? String(spool.measuredTotalWeightGrams) : "1200",
  )
  // I.2: in create mode the measured weight auto-fills as full + empty spool
  // weight until the user edits the field manually (then their value wins).
  // The dialog remounts on every open, so the flag resets naturally.
  const [measuredDirty, setMeasuredDirty] = useState(false)

  // Requested from within this dialog (immediately usable by the requester)
  const [extraMaterials, setExtraMaterials] = useState<Material[]>([])
  const [extraTypes, setExtraTypes] = useState<SpoolType[]>([])

  const allMaterials = useMemo(() => {
    const seen = new Set(materials.map((m) => m.id))
    return [...materials, ...extraMaterials.filter((m) => !seen.has(m.id))]
  }, [materials, extraMaterials])
  const allTypes = useMemo(() => {
    const seen = new Set(spoolTypes.map((t) => t.id))
    return [...spoolTypes, ...extraTypes.filter((t) => !seen.has(t.id))]
  }, [spoolTypes, extraTypes])

  // Base UI Select renders raw values unless the root gets an items map
  const materialItems = useMemo(
    () =>
      allMaterials.map((m) => ({
        value: String(m.id),
        label: `${materialLabel(m)}${m.status === "pending" ? " — pending" : ""}`,
      })),
    [allMaterials],
  )
  const typeItems = useMemo(
    () =>
      allTypes.map((t) => ({
        value: String(t.id),
        label: `${spoolTypeLabel(t)}${t.status === "pending" ? " — pending" : ""}`,
      })),
    [allTypes],
  )

  const selectedMaterial = allMaterials.find((m) => String(m.id) === materialId) ?? null
  const selectedType = allTypes.find((t) => String(t.id) === spoolTypeId) ?? null
  const selectedEmptyWeight = selectedType?.emptyWeightGrams ?? null

  useEffect(() => {
    if (editing || measuredDirty || selectedEmptyWeight === null) return
    const full = Number.parseInt(fullGrams, 10)
    if (Number.isNaN(full)) return
    setMeasuredGrams(String(full + selectedEmptyWeight))
  }, [editing, measuredDirty, fullGrams, selectedEmptyWeight])

  // Inline "request new material" mini-form
  const [requestingMaterial, setRequestingMaterial] = useState(false)
  const [reqMManufacturer, setReqMManufacturer] = useState("")
  const [reqMName, setReqMName] = useState("")
  const [reqMType, setReqMType] = useState("PLA")
  const [reqMColor, setReqMColor] = useState("#1c7ed6")
  const [reqMPending, setReqMPending] = useState(false)

  // Inline "request new spool type" mini-form
  const [requestingType, setRequestingType] = useState(false)
  const [reqManufacturer, setReqManufacturer] = useState("")
  const [reqName, setReqName] = useState("")
  const [reqGrams, setReqGrams] = useState("")
  const [reqPending, setReqPending] = useState(false)

  // Live computed preview of how much filament is actually left
  const measured = Number.parseInt(measuredGrams, 10)
  const previewLeft =
    selectedType && !Number.isNaN(measured)
      ? computeFilamentLeft(measured, selectedType.emptyWeightGrams)
      : null

  async function handleRequestMaterial() {
    if (!reqMManufacturer.trim() || !reqMName.trim()) {
      toast.error("Manufacturer and name are required")
      return
    }
    try {
      setReqMPending(true)
      const created = await requestMaterial({
        manufacturer: reqMManufacturer.trim(),
        name: reqMName.trim(),
        filamentType: reqMType,
        color: reqMColor,
      })
      setExtraMaterials((prev) => [...prev, created])
      setMaterialId(String(created.id))
      setRequestingMaterial(false)
      setReqMManufacturer("")
      setReqMName("")
      toast.success("Material requested — you can use it right away")
    } catch {
      toast.error("Could not request material")
    } finally {
      setReqMPending(false)
    }
  }

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
      setRequestingType(false)
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

    if (!selectedMaterial) {
      toast.error("Pick a material (or request a new one)")
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
    if (Number.isNaN(measuredTotal) || measuredTotal < selectedType.emptyWeightGrams) {
      toast.error("Measured weight can't be less than the empty spool weight")
      return
    }

    const payload = {
      materialId: selectedMaterial.id,
      spoolTypeId: selectedType.id,
      fullFilamentWeightGrams: full,
      measuredTotalWeightGrams: measuredTotal,
    }

    try {
      setSaving(true)
      if (editing && spool) {
        await updateSpool(spool.id, payload)
        toast.success("Spool updated")
      } else {
        await createSpool(payload)
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
              ? "Update this physical spool."
              : "Register a physical spool of a material. Remaining filament is calculated from the weighed total."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="material">Material</Label>
              {!requestingMaterial && (
                <button
                  type="button"
                  onClick={() => setRequestingMaterial(true)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Request new
                </button>
              )}
            </div>
            <Select
              items={materialItems}
              value={materialId}
              onValueChange={(value) => value && setMaterialId(value)}
            >
              <SelectTrigger id="material" className="w-full">
                <SelectValue placeholder="Pick a material" />
              </SelectTrigger>
              <SelectContent>
                {materialItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requestingMaterial && (
            <div className="flex flex-col gap-3 rounded-md border border-border bg-secondary/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Request new material</span>
                <button
                  type="button"
                  onClick={() => setRequestingMaterial(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close material request form"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reqMManufacturer" className="text-xs">
                    Manufacturer
                  </Label>
                  <Input
                    id="reqMManufacturer"
                    value={reqMManufacturer}
                    onChange={(e) => setReqMManufacturer(e.target.value)}
                    placeholder="e.g. Prusament"
                    className="h-8"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reqMName" className="text-xs">
                    Material name
                  </Label>
                  <Input
                    id="reqMName"
                    value={reqMName}
                    onChange={(e) => setReqMName(e.target.value)}
                    placeholder="e.g. Galaxy Black"
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reqMType" className="text-xs">
                    Type
                  </Label>
                  <Select value={reqMType} onValueChange={(v) => v && setReqMType(v)}>
                    <SelectTrigger id="reqMType" className="h-8">
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
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reqMColor" className="text-xs">
                    Color
                  </Label>
                  <input
                    id="reqMColor"
                    type="color"
                    value={reqMColor}
                    onChange={(e) => setReqMColor(e.target.value)}
                    className="h-8 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
                    aria-label="Material color"
                  />
                </div>
                <Button type="button" size="sm" onClick={handleRequestMaterial} disabled={reqMPending}>
                  {reqMPending ? "Requesting…" : "Request"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                You can use it immediately; an admin will review it for the global catalog.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="spoolType">Spool type</Label>
              {!requestingType && (
                <button
                  type="button"
                  onClick={() => {
                    setRequestingType(true)
                    setReqManufacturer(selectedMaterial?.manufacturer ?? "")
                  }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Request new
                </button>
              )}
            </div>
            <Select
              items={typeItems}
              value={spoolTypeId}
              onValueChange={(value) => value && setSpoolTypeId(value)}
            >
              <SelectTrigger id="spoolType" className="w-full">
                <SelectValue placeholder="Pick a spool type" />
              </SelectTrigger>
              <SelectContent>
                {typeItems.map((item) => (
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

          {requestingType && (
            <div className="flex flex-col gap-3 rounded-md border border-border bg-secondary/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Request new spool type</span>
                <button
                  type="button"
                  onClick={() => setRequestingType(false)}
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
                <Button type="button" size="sm" onClick={handleRequestSpoolType} disabled={reqPending}>
                  {reqPending ? "Requesting…" : "Request"}
                </Button>
              </div>
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
                onChange={(e) => {
                  setMeasuredDirty(true)
                  setMeasuredGrams(e.target.value)
                }}
              />
              <p className="text-xs text-muted-foreground">
                {editing || measuredDirty
                  ? "Put the whole spool on a scale and enter the value."
                  : "Prefilled for a fresh spool (filament + empty spool) — adjust to your scale value."}
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
