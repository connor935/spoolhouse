"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthCard } from "@/components/auth-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get("token")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-destructive">This reset link is invalid or incomplete.</p>
        <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
          Request a new link
        </Link>
      </div>
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError("Passwords don't match")
      return
    }
    setPending(true)
    setError(null)
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! })
    if (error) {
      setError(error.message ?? "Reset failed — the link may have expired.")
      setPending(false)
      return
    }
    toast.success("Password updated — sign in with your new password")
    router.push("/login")
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={process.env.MINIMUM_PASSWORD_LENGTH ? parseInt(process.env.MINIMUM_PASSWORD_LENGTH) : 12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Repeat new password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={process.env.MINIMUM_PASSWORD_LENGTH ? parseInt(process.env.MINIMUM_PASSWORD_LENGTH) : 12}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} className="bg-accent text-accent-foreground hover:bg-accent/90">
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" description={`At least ${process.env.MINIMUM_PASSWORD_LENGTH || 12} characters.`}>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  )
}
