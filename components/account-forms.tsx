"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

export function AccountForms({
  name: initialName,
  minLength,
}: {
  name: string
  minLength: number
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [namePending, setNamePending] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [pwPending, setPwPending] = useState(false)

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setNamePending(true)
    const { error } = await authClient.updateUser({ name: name.trim() })
    setNamePending(false)
    if (error) {
      toast.error(error.message ?? "Could not update name")
      return
    }
    toast.success("Display name updated")
    router.refresh()
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirm) {
      toast.error("New passwords don't match")
      return
    }
    setPwPending(true)
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    })
    setPwPending(false)
    if (error) {
      toast.error(error.message ?? "Could not change password")
      return
    }
    toast.success("Password changed")
    setCurrentPassword("")
    setNewPassword("")
    setConfirm("")
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Display name</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is the name group members will see.
        </p>
        <form onSubmit={saveName} className="mt-4 flex flex-col gap-4 sm:max-w-sm">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={namePending || name.trim() === initialName} className="self-start">
            {namePending ? "Saving…" : "Save name"}
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          At least {minLength} characters. Other sessions are signed out after the change.
        </p>
        <form onSubmit={changePassword} className="mt-4 flex flex-col gap-4 sm:max-w-sm">
          <div className="flex flex-col gap-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={minLength}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password">Repeat new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={minLength}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pwPending} className="self-start">
            {pwPending ? "Changing…" : "Change password"}
          </Button>
        </form>
      </section>
    </div>
  )
}
