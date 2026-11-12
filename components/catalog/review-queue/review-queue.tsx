'use client';

import { CheckCheckIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { PageHeader, type Crumb } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { Swatch } from '@/components/inventory/swatch';
import { Button, buttonVariants } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { useHotkeys } from '@/hooks/use-hotkeys';

import { DuplicateCandidateRow } from '../duplicate-candidate-row';
import { ReviewSummary } from '../review-summary';

type UpNextEntry = {
  id: string;
  manufacturer: string;
  name: string;
  /** Material colour; `undefined` (spool types) drops the swatch. */
  color?: string | null;
  tag: string;
  submittedAgo: string;
};

type ReviewQueueProps = {
  title: string;
  breadcrumb: Crumb[];
  /** "material" or "spool type". */
  noun: string;
  pendingCount: number;
  /** 0-based index of the entry under review. */
  position: number;
  /** The entry under review; omit when the queue is empty. */
  summary?: React.ComponentProps<typeof ReviewSummary>;
  duplicates: (React.ComponentProps<typeof DuplicateCandidateRow> & {
    id: string;
  })[];
  upNext: UpNextEntry[];
  /** Next entry without deciding; null when it is the only one. */
  skipHref: string | null;
  /** Back to the admin table. */
  backHref: string;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  /** A decision is in flight. */
  busy?: boolean;
};

/**
 * The admin review queue (ReviewQueue board): one pending entry at a time,
 * oldest first, with its facts, the decision bar (keyboard hints shown; the
 * shortcuts themselves arrive with the command layer), possible duplicates
 * and what comes next.
 */
function ReviewQueue({
  title,
  breadcrumb,
  noun,
  pendingCount,
  position,
  summary,
  duplicates,
  upNext,
  skipHref,
  backHref,
  onApprove,
  onReject,
  onEdit,
  busy = false,
}: ReviewQueueProps) {
  const skipRef = React.useRef<HTMLAnchorElement>(null);
  const decide = (action: () => void) => () => {
    if (!busy) action();
  };
  useHotkeys(
    {
      r: decide(onReject),
      e: decide(onEdit),
      a: decide(onApprove),
      // Through the link, so it stays a client-side navigation.
      j: () => skipRef.current?.click(),
    },
    summary !== undefined
  );
  const header = (
    <PageHeader
      breadcrumb={breadcrumb}
      title={title}
      meta={
        pendingCount > 0
          ? `${position + 1} of ${pendingCount} pending · oldest first`
          : 'Queue empty'
      }
    />
  );

  if (!summary) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <EmptyState
          icon={<CheckCheckIcon />}
          title="All caught up"
          description={`No ${noun}s are waiting for review.`}
          action={
            <Link
              href={backHref}
              className={buttonVariants({ variant: 'outline' })}
            >
              Back to the catalog
            </Link>
          }
        />
      </div>
    );
  }

  const more = pendingCount - 1 - upNext.length;

  return (
    <div className="flex flex-col gap-5">
      {header}
      <div className="flex flex-wrap items-start gap-6">
        <article
          aria-label={`Reviewing ${summary.entry.name}`}
          className="border-ink bg-card min-w-0 flex-[3_1_560px] rounded-[4px] border"
        >
          <ReviewSummary {...summary} />
          <div className="border-ink flex flex-wrap items-center gap-2.5 border-t p-[18px] max-sm:p-3">
            <Button
              variant="destructive-outline"
              size="lg"
              disabled={busy}
              onClick={onReject}
              aria-keyshortcuts="R"
            >
              Reject <Kbd aria-hidden>R</Kbd>
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={onEdit}
              aria-keyshortcuts="E"
            >
              Edit <Kbd aria-hidden>E</Kbd>
            </Button>
            <span className="flex-1" />
            {skipHref && (
              <Link
                ref={skipRef}
                href={skipHref}
                aria-keyshortcuts="J"
                className={buttonVariants({ variant: 'ghost' })}
              >
                Skip <Kbd aria-hidden>J</Kbd>
              </Link>
            )}
            <Button
              size="lg"
              className="min-w-[180px] max-sm:flex-1"
              disabled={busy}
              onClick={onApprove}
              aria-keyshortcuts="A"
            >
              Approve <Kbd aria-hidden>A</Kbd>
            </Button>
          </div>
        </article>

        <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-8">
          <section aria-labelledby="review-duplicates">
            <SectionHeader id="review-duplicates" title="Possible duplicates" />
            <div className="mt-4">
              {duplicates.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nothing similar in the catalog.
                </p>
              ) : (
                duplicates.map((d) => (
                  <DuplicateCandidateRow key={d.id} {...d} />
                ))
              )}
              {duplicates.length > 0 && (
                <p className="text-muted-foreground mt-2.5 text-xs leading-snug">
                  If it&apos;s a duplicate, reject it — the submitter can still
                  use their own entry.
                </p>
              )}
            </div>
          </section>

          {upNext.length > 0 && (
            <section aria-labelledby="review-up-next">
              <SectionHeader id="review-up-next" title="Up next" />
              <ol className="mt-4">
                {upNext.map((e) => (
                  <li
                    key={e.id}
                    className="border-border flex items-center gap-3 border-t py-2.5 first:border-t-0 first:pt-0"
                  >
                    {e.color !== undefined && (
                      <Swatch color={e.color} decorative />
                    )}
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate">
                        <span className="text-muted-foreground">
                          {e.manufacturer} ·
                        </span>{' '}
                        {e.name}
                      </span>
                      <span className="kicker">
                        {e.tag} · {e.submittedAgo}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              {more > 0 && <p className="kicker mt-2.5">+ {more} more</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export { ReviewQueue };
export type { UpNextEntry };
