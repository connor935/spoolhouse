import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type ManufacturerHeaderProps = ComponentProps<'div'> & {
  name: string;
  /** Entries in the catalog for this manufacturer, which may exceed the rows shown. */
  count?: number;
  /** Heading level; the page title is the h1. */
  level?: 2 | 3;
  /** Mobile (CatalogMobile board): smaller name, less space above. */
  compact?: boolean;
};

// Design language: `.mfr` in .claude/design/spoolhouse.css. Display name and a
// mono count over an ink rule, heading each manufacturer group.
function ManufacturerHeader({
  name,
  count,
  level = 2,
  compact = false,
  className,
  ...props
}: ManufacturerHeaderProps) {
  const Heading = `h${level}` as const;
  return (
    <div
      data-slot="manufacturer-header"
      className={cn(
        'border-ink flex items-baseline gap-2.5 border-b pb-2',
        compact ? 'pt-2' : 'pt-[18px]',
        className
      )}
      {...props}
    >
      <Heading className={cn('display-name', !compact && 'text-[20px]')}>
        {name}
      </Heading>
      {count !== undefined && (
        <span className="kicker tabular">{count.toLocaleString('en-US')}</span>
      )}
    </div>
  );
}

export { ManufacturerHeader };
