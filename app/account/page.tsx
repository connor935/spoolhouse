import { AccountForms } from "@/components/account-forms"
import { PageShell } from "@/components/page-shell"
import { passwordMinLength } from "@/lib/auth"
import { requireUser } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const user = await requireUser()
  return (
    <PageShell title="Account" description={user.email}>
      <AccountForms name={user.name} minLength={passwordMinLength} />
    </PageShell>
  )
}
