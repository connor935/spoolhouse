"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, RefreshCw, Trash2, UserMinus } from "lucide-react"
import { deleteGroup, removeMember, renameGroup, rotateInviteCode } from "@/app/actions/groups"
import type { Group, GroupMember } from "@/lib/db/schema"
import { toast } from "sonner"

type MemberRow = { member: GroupMember; name: string; email: string }

export function GroupOwnerTools({ group, members }: { group: Group; members: MemberRow[] }) {
  const router = useRouter()
  const [name, setName] = useState(group.name)
  const [inviteCode, setInviteCode] = useState(group.inviteCode)
  const [pending, setPending] = useState(false)

  const inviteLink =
    typeof window === "undefined" ? `/groups/join/${inviteCode}` : `${globalThis.location.origin}/groups/join/${inviteCode}`

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Group name is required")
      return
    }
    setPending(true)
    try {
      await renameGroup(group.id, name.trim())
      toast.success("Group renamed")
      router.refresh()
    } catch {
      toast.error("Could not rename group")
    } finally {
      setPending(false)
    }
  }

  async function handleRotate() {
    setPending(true)
    try {
      const newCode = await rotateInviteCode(group.id)
      setInviteCode(newCode)
      toast.success("Invite code rotated — the old link no longer works")
    } catch {
      toast.error("Could not rotate invite code")
    } finally {
      setPending(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink)
    toast.success("Invite link copied")
  }

  async function handleRemove(userId: string) {
    setPending(true)
    try {
      await removeMember(group.id, userId)
      toast.success("Member removed")
      router.refresh()
    } catch {
      toast.error("Could not remove member")
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    if (!globalThis.confirm(`Delete "${group.name}"? This removes it for all members and can't be undone.`)) return
    setPending(true)
    try {
      await deleteGroup(group.id)
      toast.success("Group deleted")
      router.push("/groups")
    } catch {
      toast.error("Could not delete group")
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleRename} className="flex items-end gap-2 sm:max-w-sm">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="rename-group">Group name</Label>
          <Input id="rename-group" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          Rename
        </Button>
      </form>

      <div className="flex flex-col gap-2">
        <Label>Invite link</Label>
        <div className="flex items-center gap-2">
          <Input value={inviteLink} readOnly className="font-mono text-xs" />
          <Button type="button" size="icon" variant="outline" onClick={handleCopy} aria-label="Copy invite link">
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleRotate}
            disabled={pending}
            aria-label="Rotate invite code"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Rotating invalidates the old code/link.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Members</Label>
        <ul className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-1">
          {members.map(({ member, name: memberName, email }) => (
            <li key={member.id} className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm">
              <span>
                {memberName} <span className="text-muted-foreground">({email})</span>
                {member.role === "owner" && <span className="ml-2 text-xs text-muted-foreground">Owner</span>}
              </span>
              {member.role !== "owner" && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => handleRemove(member.userId)}
                  aria-label={`Remove ${memberName}`}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-destructive">Danger zone</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Deleting the group removes it and all its share settings and lend history for every member.
        </p>
        <Button variant="destructive" size="sm" className="mt-3" onClick={handleDelete} disabled={pending}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete group
        </Button>
      </div>
    </div>
  )
}
