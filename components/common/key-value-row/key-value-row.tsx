import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type KeyValueRowProps = {
  label: ReactNode;
  /** The value; set it in mono with a muted unit where it is a measurement. */
  children: ReactNode;
  /** Right column, e.g. edit/delete icon buttons. */
  action?: ReactNode;
  className?: string;
};

// Design language: `.kv` in .claude/design/spoolhouse.css (material
// properties). Stack rows directly; the first one drops its top border.
function KeyValueRow({ label, children, action, className }: KeyValueRowProps) {
  return (
    <div
      data-slot="key-value-row"
      className={cn(
        'border-border grid grid-cols-[minmax(140px,220px)_minmax(0,1fr)_auto] items-center gap-3.5 border-t py-2.5 first:border-t-0 max-sm:grid-cols-[minmax(88px,112px)_minmax(0,1fr)_auto] max-sm:gap-2.5',
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">{label}</div>
      <div className="min-w-0">{children}</div>
      <div className="flex items-center gap-0.5">{action}</div>
    </div>
  );
}

export { KeyValueRow };
