import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AccountForms } from "@/components/account-forms"
import { ApiTokensSection } from "@/components/api-tokens-section"
import { getApiTokens } from "@/app/actions/api-tokens"
import { passwordMinLength } from "@/lib/auth"
import { requireUser } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const user = await requireUser()
  const tokens = await getApiTokens()
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Account</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      <AccountForms name={user.name} minLength={passwordMinLength} />
      <div className="mt-6">
        <ApiTokensSection tokens={tokens} />
      </div>
    </main>
  )
}
