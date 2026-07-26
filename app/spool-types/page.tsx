import { PageShell } from '@/components/layout/page-shell';
import { RequestSpoolTypeForm } from '@/components/catalog/request-spool-type-form';
import { SpoolTypeCatalog } from '@/components/catalog/spool-type-catalog';
import { getSpoolTypeCatalog } from '@/app/actions/spool-types';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function SpoolTypesPage() {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';
  const types = await getSpoolTypeCatalog();

  return (
    <PageShell
      title="Spool catalog"
      description={
        isAdmin
          ? "Global spool types and their empty weights. Missing one? Add it below — as an admin it's published straight away."
          : 'Global spool types and their empty weights. Missing one? Request it below — you can use it immediately while an admin reviews it.'
      }
    >
      <SpoolTypeCatalog spoolTypes={types} currentUserId={user.id} />

      <section className="border-border bg-card mt-6 rounded-lg border p-6">
        <h2 className="font-semibold">
          {isAdmin ? 'Add a new spool type' : 'Request a new spool type'}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Weigh a bare, empty spool and enter its details.
        </p>
        <RequestSpoolTypeForm isAdmin={isAdmin} />
      </section>
    </PageShell>
  );
}
