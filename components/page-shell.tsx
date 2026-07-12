import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Shared layout for all sub-pages (everything except the dashboard and the
// join-invite page): single source of truth for container width, back-link
// and title pattern. Async server component — fetches the bell count itself.
export async function PageShell({
  title,
  description,
  backHref = '/',
  backLabel = 'Back to dashboard',
  children,
}: {
  title: string;
  description?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      )}
      {children}
    </main>
  );
}
