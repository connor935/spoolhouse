import Link from 'next/link';

import {
  AvatarStack,
  type AvatarPerson,
} from '@/components/common/avatar-stack';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type GroupRole = 'owner' | 'member';

type GroupCardProps = {
  name: string;
  href: string;
  role: GroupRole;
  /** Shown as initials; the stack collapses past five into "+N". */
  members: AvatarPerson[];
  /** Total members, when `members` is only the first few. */
  memberCount?: number;
  sharedSpoolCount: number;
  /** Your spools visible in this group. */
  youShareCount: number;
  className?: string;
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="kicker">{label}</dt>
      <dd className="display-num m-0 text-[30px]">{value}</dd>
    </div>
  );
}

/**
 * A group on /groups (Groups 01): name, your role, member initials and the
 * Members / Shared spools / You share counts. The whole card is the link.
 */
function GroupCard({
  name,
  href,
  role,
  members,
  memberCount = members.length,
  sharedSpoolCount,
  youShareCount,
  className,
}: GroupCardProps) {
  return (
    <article
      data-slot="group-card"
      className={cn(
        'border-ink bg-card text-card-foreground focus-within:ring-accent hover:border-accent relative flex flex-col gap-3.5 rounded-[4px] border py-[18px] pr-[18px] pl-8 transition-colors focus-within:ring-2',
        className
      )}
    >
      <span
        aria-hidden
        className="border-ink bg-background absolute top-[26px] left-3 size-[7px] rounded-full border"
      />
      <div className="flex items-center justify-between gap-2.5">
        <h3 className="display-name m-0 min-w-0 truncate text-[26px]">
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {name}
          </Link>
        </h3>
        <Badge variant={role === 'owner' ? 'inverted' : 'muted'}>
          {role === 'owner' ? 'Owner' : 'Member'}
        </Badge>
      </div>
      <AvatarStack
        people={members}
        label={`Members of ${name}`}
        className="flex-nowrap"
      />
      <dl className="border-border m-0 flex gap-7 border-t border-dashed pt-3">
        <Stat label="Members" value={memberCount} />
        <Stat label="Shared spools" value={sharedSpoolCount} />
        <Stat label="You share" value={youShareCount} />
      </dl>
    </article>
  );
}

export { GroupCard };
