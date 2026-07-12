import { MaterialCatalogRow } from '@/components/material-catalog-row';
import { PageShell } from '@/components/page-shell';
import { RequestMaterialForm } from '@/components/request-material-form';
import { getMaterialCatalog } from '@/app/actions/materials';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';
  const catalog = await getMaterialCatalog();

  const byManufacturer = new Map<string, typeof catalog>();
  for (const m of catalog) {
    const list = byManufacturer.get(m.manufacturer) ?? [];
    list.push(m);
    byManufacturer.set(m.manufacturer, list);
  }

  return (
    <PageShell
      title="Materials"
      description={
        isAdmin
          ? "Global material catalog. Missing one? Add it below — as an admin it's published straight away."
          : 'Global material catalog. Missing one? Request it below — you can use it immediately while an admin reviews it.'
      }
    >
      {[...byManufacturer.entries()].map(([manufacturer, list]) => (
        <section
          key={manufacturer}
          className="border-border bg-card mt-6 rounded-lg border"
        >
          <h2 className="border-border border-b px-6 py-3 font-semibold">
            {manufacturer}
          </h2>
          <ul className="divide-border divide-y">
            {list.map((m) => (
              <MaterialCatalogRow
                key={m.id}
                material={m}
                currentUserId={user.id}
              />
            ))}
          </ul>
        </section>
      ))}

      <section className="border-border bg-card mt-6 rounded-lg border p-6">
        <h2 className="font-semibold">
          {isAdmin ? 'Add a new material' : 'Request a new material'}
        </h2>
        <RequestMaterialForm isAdmin={isAdmin} />
      </section>
    </PageShell>
  );
}
