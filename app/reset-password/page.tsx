import { Suspense } from "react"
import { AuthCard } from "@/components/auth-card"
import { ResetPasswordForm } from "@/components/reset-password-form"
import { passwordMinLength } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" description={`At least ${passwordMinLength} characters.`}>
      <Suspense>
        <ResetPasswordForm minLength={passwordMinLength} />
      </Suspense>
    </AuthCard>
  )
}
