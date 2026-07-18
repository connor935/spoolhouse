import { MaterialCatalog } from '@/components/material-catalog';
import { PageShell } from '@/components/page-shell';
import { RequestMaterialForm } from '@/components/request-material-form';
import { getMaterialCatalog } from '@/app/actions/materials';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';
  const catalog = await getMaterialCatalog();

  return (
    <PageShell
      title="Materials"
      description={
        isAdmin
          ? "Global material catalog. Missing one? Add it below — as an admin it's published straight away."
          : 'Global material catalog. Missing one? Request it below — you can use it immediately while an admin reviews it.'
      }
    >
      <MaterialCatalog materials={catalog} currentUserId={user.id} />

      <section className="border-border bg-card mt-6 rounded-lg border p-6">
        <h2 className="font-semibold">
          {isAdmin ? 'Add a new material' : 'Request a new material'}
        </h2>
        <RequestMaterialForm isAdmin={isAdmin} />
      </section>
    </PageShell>
  );
}
