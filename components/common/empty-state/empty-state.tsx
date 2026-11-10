import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type EmptyStateProps = {
  /** Lucide icon element; in the onboarding variant it sits in an accent tile. */
  icon?: ReactNode;
  /** Small mono label naming the surface ("Inventory"). */
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Button(s) below the text. */
  action?: ReactNode;
  /**
   * Numbered steps; makes this the onboarding variant ("Your shelf is
   * empty"), whose title is a display <h2>.
   */
  steps?: ReactNode[];
  className?: string;
};

// Design language: `.empty` in .claude/design/spoolhouse.css; both variants on
// the Patterns board, section 04.
function EmptyState({
  icon,
  kicker,
  title,
  description,
  action,
  steps,
  className,
}: EmptyStateProps) {
  const onboarding = steps !== undefined;

  return (
    <div
      data-slot="empty-state"
      className={cn(
        'border-ink bg-card/60 flex flex-col items-center justify-center rounded-[6px] border border-dashed text-center',
        onboarding ? 'gap-3.5 px-7 py-10' : 'gap-2.5 px-6 py-8',
        className
      )}
    >
      {kicker && <span className="kicker">{kicker}</span>}
      {icon &&
        (onboarding ? (
          <span
            aria-hidden="true"
            className="bg-accent text-accent-foreground grid size-12 place-items-center rounded-[7px] [&_svg]:size-6 [&_svg]:stroke-[1.5]"
          >
            {icon}
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="text-muted-foreground [&_svg]:size-6 [&_svg]:stroke-[1.5]"
          >
            {icon}
          </span>
        ))}
      {onboarding ? (
        <h2 className="display-h2 m-0 text-[34px]">{title}</h2>
      ) : (
        <p className="m-0 max-w-[300px]">{title}</p>
      )}
      {description && (
        <p
          className={cn(
            'text-muted-foreground m-0 max-w-[300px]',
            !onboarding && 'text-xs leading-[1.4]'
          )}
        >
          {description}
        </p>
      )}
      {onboarding && steps.length > 0 && (
        <ol className="my-1 flex list-none flex-col gap-1.5 p-0 text-left">
          {steps.map((step, i) => (
            <li key={i} className="kicker">
              <span className="text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>{' '}
              {step}
            </li>
          ))}
        </ol>
      )}
      {action && (
        <div className="flex flex-wrap justify-center gap-2">{action}</div>
      )}
    </div>
  );
}

export { EmptyState };
