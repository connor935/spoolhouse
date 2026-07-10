"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import {
  approveSpoolType,
  deleteSpoolType,
  rejectSpoolType,
  updateSpoolType,
  type SpoolTypeWithUsage,
} from "@/app/actions/spool-types"
import type { SpoolType } from "@/lib/db/schema"
import { toast } from "sonner"

type Props = {
  spoolType: SpoolType | SpoolTypeWithUsage
  // "review": pending-queue card (approve/reject). "manage": full-catalog row
  // (admin can save edits + delete; used beyond the pending queue).
  mode?: "review" | "manage"
}

export function SpoolTypeReview({ spoolType, mode = "review" }: Props) {
  const router = useRouter()
  const [manufacturer, setManufacturer] = useState(spoolType.manufacturer)
  const [name, setName] = useState(spoolType.name)
  const [grams, setGrams] = useState(String(spoolType.emptyWeightGrams))
  const [pending, setPending] = useState(false)
  const spoolCount = "spoolCount" in spoolType ? spoolType.spoolCount : 0

  function parsedGrams() {
    const emptyWeightGrams = Number.parseInt(grams, 10)
    if (Number.isNaN(emptyWeightGrams) || emptyWeightGrams <= 0) {
      toast.error("Empty spool weight must be greater than 0 g")
      return null
    }
    return emptyWeightGrams
  }

  async function handle(action: "approve" | "reject") {
    setPending(true)
    try {
      if (action === "approve") {
        const emptyWeightGrams = parsedGrams()
        if (emptyWeightGrams === null) {
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

  async function handleSave() {
    const emptyWeightGrams = parsedGrams()
    if (emptyWeightGrams === null) return
    setPending(true)
    try {
      await updateSpoolType(spoolType.id, {
        manufacturer: manufacturer.trim(),
        name: name.trim(),
        emptyWeightGrams,
      })
      toast.success("Spool type updated")
      router.refresh()
    } catch {
      toast.error("Could not update spool type")
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${manufacturer} — ${name}"? This can't be undone.`)) return
    setPending(true)
    try {
      await deleteSpoolType(spoolType.id)
      toast.success("Spool type deleted")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete spool type")
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
                spoolType.status === "rejected" ? "border-destructive/40 text-destructive" : "text-muted-foreground"
              }
            >
              {spoolType.status}
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
