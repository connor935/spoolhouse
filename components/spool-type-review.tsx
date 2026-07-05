"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { approveSpoolType, rejectSpoolType } from "@/app/actions/spool-types"
import type { SpoolType } from "@/lib/db/schema"
import { toast } from "sonner"

export function SpoolTypeReview({ spoolType }: { spoolType: SpoolType }) {
  const router = useRouter()
  const [manufacturer, setManufacturer] = useState(spoolType.manufacturer)
  const [name, setName] = useState(spoolType.name)
  const [grams, setGrams] = useState(String(spoolType.emptyWeightGrams))
  const [pending, setPending] = useState(false)

  async function handle(action: "approve" | "reject") {
    setPending(true)
    try {
      if (action === "approve") {
        const emptyWeightGrams = Number.parseInt(grams, 10)
        if (Number.isNaN(emptyWeightGrams) || emptyWeightGrams <= 0) {
          toast.error("Empty spool weight must be greater than 0 g")
          setPending(false)
          return
        }
        await approveSpoolType(spoolType.id, {
          manufacturer: manufacturer.trim(),
          name: name.trim(),
          emptyWeightGrams,
        })
        toast.success("Spool type approved")
      } else {
        await rejectSpoolType(spoolType.id)
        toast.success("Spool type rejected")
      }
      router.refresh()
    } catch {
      toast.error("Review action failed")
      setPending(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`rev-manufacturer-${spoolType.id}`} className="text-xs">
            Manufacturer
          </Label>
          <Input
            id={`rev-manufacturer-${spoolType.id}`}
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`rev-name-${spoolType.id}`} className="text-xs">
            Spool name
          </Label>
          <Input
            id={`rev-name-${spoolType.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`rev-grams-${spoolType.id}`} className="text-xs">
            Empty weight (g)
          </Label>
          <Input
            id={`rev-grams-${spoolType.id}`}
            type="number"
            step="1"
            min="1"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
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
