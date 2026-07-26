import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SwaggerDocs } from '@/components/api-docs/swagger-docs';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'API docs — Spoolhouse' };

export default async function ApiDocsPage() {
  await requireUser();
  return (
    // Swagger UI ships light-only styles, so this page keeps a white canvas
    // regardless of the app theme.
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <Link
          href="/account"
          className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to account
        </Link>
        <SwaggerDocs url="/api/v1/openapi.json" />
      </div>
    </main>
  );
}
