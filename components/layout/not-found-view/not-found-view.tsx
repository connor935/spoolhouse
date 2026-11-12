import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NotFoundViewProps = {
  className?: string;
};

/**
 * The 404 page (Patterns board, 05): oversized accent "404" beside the
 * message, under the scale-ruler edge. Rendered by app/not-found.tsx, which
 * sits outside the signed-in shell, so the links work for everyone.
 */
function NotFoundView({ className }: NotFoundViewProps) {
  return (
    <div
      data-slot="not-found-view"
      className={cn(
        'flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-12',
        className
      )}
    >
      <span
        aria-hidden
        className="display-h1 text-accent-ink text-[120px] leading-[0.8] sm:text-[200px]"
      >
        404
      </span>
      <div className="flex max-w-[460px] flex-col gap-3">
        <span className="kicker">Error · shelf not found</span>
        <h1 className="display-h1 text-[40px] sm:text-[52px]">
          Nothing on this shelf
        </h1>
        <p className="text-muted-foreground">
          The page you&apos;re looking for isn&apos;t in the warehouse — maybe
          it moved, or the link is old.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className={buttonVariants()}>
            Back to overview
          </Link>
          <Link
            href="/materials"
            className={buttonVariants({ variant: 'outline' })}
          >
            Search catalog
          </Link>
        </div>
      </div>
    </div>
  );
}

export { NotFoundView };
