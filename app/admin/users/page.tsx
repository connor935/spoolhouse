import { asc } from "drizzle-orm"
import { Badge } from "@/components/ui/badge"
import { CreateUserForm } from "@/components/create-user-form"
import { PageShell } from "@/components/page-shell"
import { passwordMinLength } from "@/lib/auth"
import { requireAdmin } from "@/lib/auth-session"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  await requireAdmin()
  const users = await db.select().from(user).orderBy(asc(user.createdAt))

  return (
    <PageShell
      title="Users"
      description="Registration is closed — accounts are created here. Share the temporary password, or tell the new member to use “Forgot password” with their email."
    >
      <section className="mt-6 rounded-lg border border-border bg-card">
        <ul className="divide-y divide-border">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
              </div>
              {u.role === "admin" && <Badge>Admin</Badge>}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Create user</h2>
        <CreateUserForm minLength={passwordMinLength} />
      </section>
    </PageShell>
  )
}
