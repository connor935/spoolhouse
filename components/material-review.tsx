"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { approveMaterial, rejectMaterial } from "@/app/actions/materials"
import { FILAMENT_TYPES } from "@/lib/filament"
import type { Material } from "@/lib/db/schema"
import { toast } from "sonner"

export function MaterialReview({ material }: { material: Material }) {
  const router = useRouter()
  const [manufacturer, setManufacturer] = useState(material.manufacturer)
  const [name, setName] = useState(material.name)
  const [filamentType, setFilamentType] = useState(material.filamentType)
  const [color, setColor] = useState(material.color ?? "#94a3b8")
  const [pending, setPending] = useState(false)

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
        <Button size="sm" onClick={() => handle("approve")} disabled={pending}>
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => handle("reject")} disabled={pending}>
          Reject
        </Button>
      </div>
    </div>
  )
}
