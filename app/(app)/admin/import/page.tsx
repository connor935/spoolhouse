import Link from 'next/link';
import { PageShell } from '@/components/layout/page-shell';
import { ImportManufacturers } from '@/components/admin/import-manufacturers';
import { getUpstreamManufacturers } from '@/app/actions/spoolmandb';
import { requireAdmin } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AdminImportPage() {
  await requireAdmin();
  const manufacturers = await getUpstreamManufacturers();

  return (
    <PageShell
      title="Import catalog"
      description={
        <>
          Seed the global catalogs from{' '}
          <a
            href="https://github.com/Icezaza2543/SpoolmanDB-Community"
            className="hover:text-foreground underline"
            target="_blank"
            rel="noreferrer"
          >
            SpoolmanDB-Community
          </a>
          . Pick any number of manufacturers — they are imported one after
          another. Importing is insert-only: existing entries are never
          overwritten, so re-running is safe and only adds what is new. Review
          the result on{' '}
          <Link
            href="/admin/materials"
            className="hover:text-foreground underline"
          >
            manage materials
          </Link>
          .
        </>
      }
    >
      <ImportManufacturers manufacturers={manufacturers} />
    </PageShell>
  );
}
