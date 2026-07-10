"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateShareSettings } from "@/app/actions/groups"
import type { Material } from "@/lib/db/schema"
import { toast } from "sonner"

type ShareMode = "all" | "whitelist" | "blacklist"

const SHARE_MODE_ITEMS: { value: ShareMode; label: string }[] = [
  { value: "all", label: "Share all materials" },
  { value: "whitelist", label: "Share only selected materials" },
  { value: "blacklist", label: "Share all except selected materials" },
]

// Sharing is material-level: an override applies to all of the member's
// spools of that material (including future ones).
export function GroupSharingSettings({
  groupId,
  initialShareMode,
  initialOverrideIds,
  ownMaterials,
}: {
  groupId: number
  initialShareMode: ShareMode
  initialOverrideIds: number[]
  ownMaterials: Material[]
}) {
  const router = useRouter()
  const [shareMode, setShareMode] = useState<ShareMode>(initialShareMode)
  const [overrideIds, setOverrideIds] = useState<Set<number>>(new Set(initialOverrideIds))
  const [saving, setSaving] = useState(false)

  function toggle(id: number) {
    setOverrideIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateShareSettings(groupId, shareMode, [...overrideIds])
      toast.success("Sharing settings saved")
      router.refresh()
    } catch {
      toast.error("Could not save sharing settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="share-mode">Share mode</Label>
        <Select
          items={SHARE_MODE_ITEMS}
          value={shareMode}
          onValueChange={(value) => value && setShareMode(value as ShareMode)}
        >
          <SelectTrigger id="share-mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHARE_MODE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {shareMode !== "all" && (
        <div className="flex flex-col gap-2">
          <Label>
            {shareMode === "whitelist" ? "Materials to share" : "Materials to exclude"}
          </Label>
          {ownMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground">You don&apos;t have any spools yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
              {ownMaterials.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id={`override-${m.id}`}
                    checked={overrideIds.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <label htmlFor={`override-${m.id}`} className="cursor-pointer">
                    {m.name} <span className="text-muted-foreground">— {m.manufacturer}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="self-start">
        {saving ? "Saving…" : "Save sharing settings"}
      </Button>
    </div>
  )
}
