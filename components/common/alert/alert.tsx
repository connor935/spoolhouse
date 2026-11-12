import { cva } from 'class-variance-authority';
import { InfoIcon, TriangleAlertIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

// Design language: `.alert` (destructive) and `.note` (accent) in
// .claude/design/spoolhouse.css; both on the AdminImport board.
const messageBoxVariants = cva(
  'flex items-start gap-2.5 rounded-[4px] border text-[13px] [&>svg]:mt-px [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        alert:
          'border-destructive bg-[color-mix(in_oklab,var(--destructive)_7%,var(--card))] px-3.5 py-3 text-destructive',
        note: 'border-accent bg-[color-mix(in_oklab,var(--accent)_7%,var(--card))] px-3 py-2.5 text-foreground [&>svg]:text-accent-ink',
      },
    },
  }
);

type MessageBoxProps = Omit<ComponentProps<'div'>, 'children'> & {
  children: ReactNode;
  /** Replaces the default icon; `null` drops it. */
  icon?: ReactNode;
  /** Pushed to the right end, e.g. a "Retry" button. */
  action?: ReactNode;
};

function MessageBox({
  variant,
  icon,
  action,
  children,
  className,
  ...props
}: MessageBoxProps & { variant: 'alert' | 'note' }) {
  return (
    <div
      data-slot={variant}
      className={cn(messageBoxVariants({ variant }), className)}
      {...props}
    >
      {icon}
      {/* The alert box is red; its message reads in the normal text colour. */}
      <div className="text-foreground min-w-0 flex-1">{children}</div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  );
}

/** Destructive message (failed import, refused action). Announced at once. */
function Alert({
  icon = <TriangleAlertIcon aria-hidden="true" />,
  ...props
}: MessageBoxProps) {
  return <MessageBox role="alert" variant="alert" icon={icon} {...props} />;
}

/** Accent notice (import finished, hint). Announced politely. */
function Note({
  icon = <InfoIcon aria-hidden="true" />,
  ...props
}: MessageBoxProps) {
  return <MessageBox role="status" variant="note" icon={icon} {...props} />;
}

export { Alert, Note };
