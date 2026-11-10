import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type SectionHeaderProps = {
  title: ReactNode;
  /** Section number in mono accent, e.g. "02". */
  index?: string;
  /** Right of the rule: a link ("Inventory →"), kicker text or a control. */
  aside?: ReactNode;
  /** Put on the <h2> so the section can be `aria-labelledby` it. */
  id?: string;
  className?: string;
};

// Design language: `.sec` in .claude/design/spoolhouse.css. Links in the
// aside slot get the mono uppercase look without the caller styling them.
function SectionHeader({
  title,
  index,
  aside,
  id,
  className,
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn('mb-4 flex items-center gap-2.5', className)}
    >
      {index && (
        <span className="font-mono text-[11px] leading-none font-semibold text-accent">
          {index}
        </span>
      )}
      <h2 id={id} className="m-0 display-section text-foreground">
        {title}
      </h2>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      {aside && (
        <div className="flex items-center gap-2 whitespace-nowrap [&_a]:font-mono [&_a]:text-[11px] [&_a]:leading-none [&_a]:font-medium [&_a]:tracking-[0.08em] [&_a]:text-accent [&_a]:uppercase [&_a]:hover:text-foreground [&_a]:hover:underline">
          {aside}
        </div>
      )}
    </div>
  );
}

export { SectionHeader };
