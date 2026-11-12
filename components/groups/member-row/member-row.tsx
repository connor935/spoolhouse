import { InitialsAvatar } from '@/components/common/initials-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { GroupRole } from '../group-card';

type MemberRowProps = {
  name: string;
  role: GroupRole;
  /** The signed-in user: inverted avatar and a "you" marker. */
  you?: boolean;
  /** Mono line, e.g. "joined Mar 2026 · shares 9 · 1 active lend". */
  meta?: string;
  /** Owner only; leave unset for yourself and the owner. */
  onRemove?: () => void;
  /**
   * Why Remove is unavailable, e.g. "Mark active lends returned first".
   * Disables the button and becomes its tooltip.
   */
  removeDisabledReason?: string;
  pending?: boolean;
  className?: string;
};

/** One member on the group settings page (GroupSettings 04). */
function MemberRow({
  name,
  role,
  you,
  meta,
  onRemove,
  removeDisabledReason,
  pending,
  className,
}: MemberRowProps) {
  return (
    <li
      data-slot="member-row"
      className={cn(
        'border-border flex items-center gap-3 border-t py-3 text-sm first:border-t-0 first:pt-0',
        className
      )}
    >
      {/* The name follows in full; don't read it twice. */}
      <span aria-hidden className="flex">
        <InitialsAvatar name={name} you={you} />
      </span>
      <span className="min-w-0 flex-1 truncate">
        {name}
        {you && <span className="kicker ml-1.5">you</span>}
      </span>
      {meta && <span className="kicker max-sm:hidden">{meta}</span>}
      {role === 'owner' && <Badge variant="inverted">Owner</Badge>}
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          // aria-disabled keeps it focusable so the reason stays reachable.
          aria-disabled={removeDisabledReason ? true : undefined}
          disabled={pending}
          title={removeDisabledReason}
          aria-label={`Remove ${name}`}
          aria-description={removeDisabledReason}
          onClick={removeDisabledReason ? undefined : onRemove}
          className={cn(
            'text-destructive hover:text-destructive',
            removeDisabledReason &&
              'text-muted-foreground hover:text-muted-foreground cursor-not-allowed opacity-45 hover:bg-transparent'
          )}
        >
          Remove
        </Button>
      )}
    </li>
  );
}

export { MemberRow };
