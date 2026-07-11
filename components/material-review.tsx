"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2 } from "lucide-react"
import {
  approveMaterial,
  deleteMaterial,
  rejectMaterial,
  updateMaterial,
  type MaterialWithUsage,
} from "@/app/actions/materials"
import { FILAMENT_TYPES } from "@/lib/filament"
import type { Material } from "@/lib/db/schema"
import { toast } from "sonner"

type Props = {
  material: Material | MaterialWithUsage
  // "review": pending-queue card (approve/reject). "manage": full-catalog row
  // (admin can save edits + delete; used beyond the pending queue).
  mode?: "review" | "manage"
}

export function MaterialReview({ material, mode = "review" }: Props) {
  const router = useRouter()
  const [manufacturer, setManufacturer] = useState(material.manufacturer)
  const [name, setName] = useState(material.name)
  const [filamentType, setFilamentType] = useState(material.filamentType)
  const [color, setColor] = useState(material.color ?? "#94a3b8")
  const [pending, setPending] = useState(false)
  const spoolCount = "spoolCount" in material ? material.spoolCount : 0

  async function handle(action: "approve" | "reject") {
    setPending(true)
    try {
      if (action === "approve") {
        await approveMaterial(material.id, {
          manufacturer: manufacturer.trim(),
          name: name.trim(),
          filamentType,
          color,
        })
        toast.success("Material approved")
      } else {
        await rejectMaterial(material.id)
        toast.success("Material rejected")
      }
      router.refresh()
    } catch {
      toast.error("Review action failed")
      setPending(false)
    }
  }

  async function handleSave() {
    setPending(true)
    try {
      await updateMaterial(material.id, {
        manufacturer: manufacturer.trim(),
        name: name.trim(),
        filamentType,
        color,
      })
      toast.success("Material updated")
      router.refresh()
    } catch {
      toast.error("Could not update material")
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!globalThis.confirm(`Delete "${manufacturer} — ${name}"? This can't be undone.`)) return
    setPending(true)
    try {
      await deleteMaterial(material.id)
      toast.success("Material deleted")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete material")
      setPending(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`rev-m-manufacturer-${material.id}`} className="text-xs">
            Manufacturer
          </Label>
          <Input
            id={`rev-m-manufacturer-${material.id}`}
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`rev-m-name-${material.id}`} className="text-xs">
            Name
          </Label>
          <Input
            id={`rev-m-name-${material.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`rev-m-type-${material.id}`} className="text-xs">
            Type
          </Label>
          <Select value={filamentType} onValueChange={(v) => v && setFilamentType(v)}>
            <SelectTrigger id={`rev-m-type-${material.id}`} className="w-full">
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
          <Label htmlFor={`rev-m-color-${material.id}`} className="text-xs">
            Color
          </Label>
          <input
            id={`rev-m-color-${material.id}`}
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
            aria-label="Material color"
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {mode === "review" ? (
          <>
            <Button size="sm" onClick={() => handle("approve")} disabled={pending}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => handle("reject")} disabled={pending}>
              Reject
            </Button>
          </>
        ) : (
          <>
            <Badge
              variant="outline"
              className={
                material.status === "approved"
                  ? "text-muted-foreground"
                  : material.status === "rejected"
                    ? "border-destructive/40 text-destructive"
                    : "text-muted-foreground"
              }
            >
              {material.status}
            </Badge>
            <Button size="sm" variant="outline" onClick={handleSave} disabled={pending}>
              Save
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={pending || spoolCount > 0}
              title={spoolCount > 0 ? `In use by ${spoolCount} spool(s)` : undefined}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
            {spoolCount > 0 && (
              <span className="text-xs text-muted-foreground">
                In use by {spoolCount} spool{spoolCount === 1 ? "" : "s"}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
