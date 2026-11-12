import type { Metadata } from 'next';

import { NotFoundView } from '@/components/layout/not-found-view';

export const metadata: Metadata = { title: 'Not found — Spoolhouse' };

// Root 404 for unknown routes and notFound() calls (e.g. /signup while
// registration is closed). Outside the signed-in shell, so it owns its <main>.
export default function NotFound() {
  return (
    <main className="bg-background relative flex min-h-dvh items-center justify-center px-4 py-16">
      <div aria-hidden className="ruler absolute inset-x-0 top-0 h-3" />
      <NotFoundView />
    </main>
  );
}
