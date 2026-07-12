import Link from 'next/link';
import { MaterialReview } from '@/components/material-review';
import { PageShell } from '@/components/page-shell';
import {
  getAllMaterialsForAdmin,
  getPendingMaterials,
} from '@/app/actions/materials';
import { requireAdmin } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AdminMaterialsPage() {
  await requireAdmin();
  const [pending, all] = await Promise.all([
    getPendingMaterials(),
    getAllMaterialsForAdmin(),
  ]);

  return (
    <PageShell
      title="Review materials"
      description={
        <>
          Pending submissions. Adjust fields before approving if needed;
          approved materials become visible to all users. See the read-only view
          on{' '}
          <Link href="/materials" className="hover:text-foreground underline">
            the materials page
          </Link>
          .
        </>
      }
    >
      {pending.length === 0 ? (
        <div className="border-border bg-card/50 text-muted-foreground mt-6 rounded-lg border border-dashed px-6 py-12 text-center text-sm">
          Nothing to review — all materials are handled.
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {pending.map((m) => (
            <MaterialReview key={m.id} material={m} mode="review" />
          ))}
        </div>
      )}

      <h2 className="mt-10 font-semibold">Full catalog</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Edit any material or delete ones no spool references.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {all.map((m) => (
          <MaterialReview key={m.id} material={m} mode="manage" />
        ))}
      </div>
    </PageShell>
  );
}
