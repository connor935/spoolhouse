import { asc } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { CreateUserForm } from '@/components/create-user-form';
import { PageShell } from '@/components/page-shell';
import { TrustedContributorToggle } from '@/components/trusted-contributor-toggle';
import { passwordMinLength } from '@/lib/auth';
import { requireAdmin } from '@/lib/auth-session';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await db.select().from(user).orderBy(asc(user.createdAt));

  return (
    <PageShell
      title="Users"
      description="Registration is closed — accounts are created here. Share the temporary password, or tell the new member to use “Forgot password” with their email."
    >
      <section className="border-border bg-card mt-6 rounded-lg border">
        <ul className="divide-border divide-y">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-4 px-6 py-4"
            >
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-muted-foreground text-sm">{u.email}</p>
              </div>
              {u.role === 'admin' ? (
                <Badge>Admin</Badge>
              ) : (
                <TrustedContributorToggle
                  userId={u.id}
                  trusted={u.trustedContributor === true}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-border bg-card mt-6 rounded-lg border p-6">
        <h2 className="font-semibold">Create user</h2>
        <CreateUserForm minLength={passwordMinLength} />
      </section>
    </PageShell>
  );
}
