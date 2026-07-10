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
import { requestMaterial } from "@/app/actions/materials"
import { FILAMENT_TYPES } from "@/lib/filament"
import { toast } from "sonner"

export function RequestMaterialForm() {
  const router = useRouter()
  const [manufacturer, setManufacturer] = useState("")
  const [name, setName] = useState("")
  const [filamentType, setFilamentType] = useState("PLA")
  const [color, setColor] = useState("#1c7ed6")
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    try {
      await requestMaterial({
        manufacturer: manufacturer.trim(),
        name: name.trim(),
        filamentType,
        color,
      })
      toast.success("Material requested — you can use it right away")
      setManufacturer("")
      setName("")
      router.refresh()
    } catch {
      toast.error("Could not request material")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4 sm:max-w-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="m-manufacturer">Manufacturer</Label>
        <Input
          id="m-manufacturer"
          required
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          placeholder="e.g. Prusament"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="m-name">Material name</Label>
        <Input
          id="m-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Galaxy Black"
        />
      </div>
      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="m-type">Type</Label>
          <Select value={filamentType} onValueChange={(v) => v && setFilamentType(v)}>
            <SelectTrigger id="m-type">
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
          <Label htmlFor="m-color">Color</Label>
          <input
            id="m-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
            aria-label="Material color"
          />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Requesting…" : "Request material"}
      </Button>
    </form>
  )
}
