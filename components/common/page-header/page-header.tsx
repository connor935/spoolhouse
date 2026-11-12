import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type Crumb = { label: ReactNode; href?: string };

type PageHeaderProps = {
  title: ReactNode;
  /** Section number shown in accent before the kicker, e.g. "02". */
  index?: string;
  /** Plain kicker text ("Overview"). Ignored when `breadcrumb` is given. */
  kicker?: ReactNode;
  /** Kicker as a trail; the last crumb is the current page. */
  breadcrumb?: Crumb[];
  /** Right end of the kicker row ("Mon 09 Nov 2026 · last weighing 14:02"). */
  meta?: ReactNode;
  /** Tags next to the title (type, status). */
  badges?: ReactNode;
  /** Before the title block, e.g. a large material swatch. */
  leading?: ReactNode;
  /** Line(s) under the title: description or a row of meta chips. */
  description?: ReactNode;
  actions?: ReactNode;
  /** The 2px ink bottom rule. Turn off when a ruled ReadoutStrip follows. */
  rule?: boolean;
  className?: string;
};

// Design language: `.head` / `.head-row` / `.crumb` / `.h1` in
// .claude/design/spoolhouse.css. Renders the page's one <h1>.
function PageHeader({
  title,
  index,
  kicker,
  breadcrumb,
  meta,
  badges,
  leading,
  description,
  actions,
  rule = true,
  className,
}: PageHeaderProps) {
  const hasKicker = index || kicker || breadcrumb?.length;

  return (
    <header
      data-slot="page-header"
      className={cn(
        'flex flex-col gap-3',
        rule && 'border-ink border-b-2 pb-5',
        className
      )}
    >
      {(hasKicker || meta) && (
        <div className="kicker flex flex-wrap items-center justify-between gap-3">
          {breadcrumb?.length ? (
            <Breadcrumb index={index} crumbs={breadcrumb} />
          ) : (
            <span>
              {index && <span className="text-accent-ink">{index}</span>}
              {index && kicker && ' — '}
              {kicker}
            </span>
          )}
          {meta && <span>{meta}</span>}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-[18px]">
          {leading}
          <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="display-h1 m-0 max-sm:text-[46px]">{title}</h1>
              {badges}
            </div>
            {description && (
              <div className="text-muted-foreground max-w-[720px]">
                {description}
              </div>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}

function Breadcrumb({ index, crumbs }: { index?: string; crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        {index && (
          <li aria-hidden="true" className="flex items-center gap-2">
            <span className="text-accent-ink">{index}</span>
            <span>—</span>
          </li>
        )}
        {crumbs.map((crumb, i) => {
          const current = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {crumb.href && !current ? (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={current ? 'page' : undefined}
                  className={cn(current && 'text-foreground')}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { PageHeader };
