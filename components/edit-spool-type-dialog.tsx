"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { updateSpoolType } from "@/app/actions/spool-types"
import type { SpoolType } from "@/lib/db/schema"
import { toast } from "sonner"

export function EditSpoolTypeDialog({
  spoolType,
  open,
  onOpenChange,
}: {
  spoolType: SpoolType
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [manufacturer, setManufacturer] = useState(spoolType.manufacturer)
  const [name, setName] = useState(spoolType.name)
  const [grams, setGrams] = useState(String(spoolType.emptyWeightGrams))
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const emptyWeightGrams = Number.parseInt(grams, 10)
    if (!manufacturer.trim() || !name.trim()) {
      toast.error("Manufacturer and name are required")
      return
    }
    if (Number.isNaN(emptyWeightGrams) || emptyWeightGrams <= 0) {
      toast.error("Empty spool weight must be greater than 0 g")
      return
    }
    setSaving(true)
    try {
      await updateSpoolType(spoolType.id, {
        manufacturer: manufacturer.trim(),
        name: name.trim(),
        emptyWeightGrams,
      })
      toast.success(
        spoolType.status === "rejected" ? "Resubmitted for review" : "Spool type updated",
      )
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error("Could not update spool type")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit spool type</DialogTitle>
          <DialogDescription>
            {spoolType.status === "rejected"
              ? "Saving resubmits this spool type as pending for re-review."
              : "Only you can see this until it's approved."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-st-manufacturer">Manufacturer</Label>
            <Input
              id="edit-st-manufacturer"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-st-name">Spool name</Label>
            <Input id="edit-st-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-st-grams">Empty spool weight (g)</Label>
            <Input
              id="edit-st-grams"
              type="number"
              step="1"
              min="1"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
