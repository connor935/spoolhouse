import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

// Design language: `.result` in .claude/design/spoolhouse.css — ink box with a
// 4px accent edge for a computed outcome ("Calculated filament left") or a
// running job's progress. Pass `role="status"` when its content updates live.
function ResultBox({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="result-box"
      className={cn(
        'border-ink border-l-accent bg-card flex items-center gap-4 rounded-[4px] border border-l-4 px-4 py-3.5',
        className
      )}
      {...props}
    />
  );
}

export { ResultBox };
