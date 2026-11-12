import { SwaggerDocs } from '@/components/api-docs/swagger-docs';
import { PageHeader } from '@/components/common/page-header';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'API docs — Spoolhouse' };

export default async function ApiDocsPage() {
  await requireUser();
  return (
    <>
      <PageHeader
        title="API docs"
        breadcrumb={[
          { label: 'Account', href: '/account' },
          { label: 'API docs' },
        ]}
      />
      {/* Swagger UI ships light-only styles, so it keeps a white canvas
          regardless of the app theme. */}
      <div className="border-border overflow-hidden rounded-[4px] border bg-white px-4 py-2 text-neutral-900">
        <SwaggerDocs url="/api/v1/openapi.json" />
      </div>
    </>
  );
}
