"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { joinGroup } from "@/app/actions/groups"
import { toast } from "sonner"

export function JoinGroupForm() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) {
      toast.error("Enter an invite code")
      return
    }
    setPending(true)
    try {
      const group = await joinGroup(code.trim())
      toast.success(`Joined ${group.name}`)
      router.push(`/groups/${group.id}`)
    } catch {
      toast.error("Invalid invite code")
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex items-end gap-2 sm:max-w-sm">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="invite-code">Invite code</Label>
        <Input
          id="invite-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. aB3xY9"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Joining…" : "Join"}
      </Button>
    </form>
  )
}
