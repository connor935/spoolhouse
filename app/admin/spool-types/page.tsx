import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { SpoolTypeCatalog } from '@/components/spool-type-catalog';
import { getAllSpoolTypesForAdmin } from '@/app/actions/spool-types';
import { requireAdmin } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AdminSpoolTypesPage() {
  const admin = await requireAdmin();
  const spoolTypes = await getAllSpoolTypesForAdmin();

  return (
    <PageShell
      title="Manage spool types"
      description={
        <>
          Search the full catalog, approve/reject submissions, edit or delete any
          entry. Use the status filter (or “Review pending”) to see the queue. The
          read-only view is on{' '}
          <Link href="/spool-types" className="hover:text-foreground underline">
            the catalog page
          </Link>
          .
        </>
      }
    >
      <SpoolTypeCatalog
        spoolTypes={spoolTypes}
        currentUserId={admin.id}
        isAdmin
      />
    </PageShell>
  );
}
