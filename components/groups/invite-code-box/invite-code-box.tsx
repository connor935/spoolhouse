'use client';

import * as React from 'react';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { cn } from '@/lib/utils';

/** How long "Copied" stays before the button reads "Copy link" again. */
const COPIED_MS = 2000;

type InviteCodeBoxProps = {
  code: string;
  /** Full join link (`…/groups/join/<code>`); built by the caller. */
  link: string;
  /** Owner only. Called after the user confirmed; the old code dies. */
  onRotate?: () => void;
  rotating?: boolean;
  /** Called after a successful copy, e.g. for a toast. */
  onCopied?: () => void;
  /** Called when the clipboard is unavailable or refuses. */
  onCopyError?: () => void;
  className?: string;
};

/**
 * Invite link on the group settings page (GroupSettings 03): the code in
 * mono, Copy link (shows "Copied" for a moment) and, for the owner, Rotate
 * behind a confirm because it breaks every link already sent out.
 */
function InviteCodeBox({
  code,
  link,
  onRotate,
  rotating,
  onCopied,
  onCopyError,
  className,
}: InviteCodeBoxProps) {
  const [copied, setCopied] = React.useState(false);
  const { confirm, dialogProps } = useConfirm();

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      onCopied?.();
    } catch {
      onCopyError?.();
    }
  }

  async function rotate() {
    const ok = await confirm({
      title: 'Rotate invite code?',
      description:
        'The current code and link stop working right away. Members already in the group stay.',
      confirmLabel: 'Rotate',
    });
    if (ok) onRotate?.();
  }

  return (
    <div
      data-slot="invite-code-box"
      className={cn(
        'border-ink bg-card flex flex-col gap-2.5 rounded-[4px] border border-dashed px-3.5 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="kicker">Code</span>
          <span className="font-mono text-xl font-semibold tracking-[0.1em]">
            {code}
          </span>
        </span>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy link'}
        </Button>
        <span role="status" className="sr-only">
          {copied ? 'Invite link copied' : ''}
        </span>
      </div>
      <span className="text-muted-foreground truncate font-mono text-xs">
        {link}
      </span>
      {onRotate && (
        <div className="border-border flex flex-wrap items-center gap-2.5 border-t pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2.5"
            onClick={rotate}
            disabled={rotating}
          >
            {rotating ? 'Rotating…' : 'Rotate invite code'}
          </Button>
          <span className="text-muted-foreground text-xs">
            the old link no longer works
          </span>
        </div>
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

export { InviteCodeBox };
