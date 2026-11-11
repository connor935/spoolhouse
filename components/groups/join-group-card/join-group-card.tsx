import Link from 'next/link';
import { KeyValueRow } from '@/components/common/key-value-row';
import { Button, buttonVariants } from '@/components/ui/button';

type JoinGroupCardProps = {
  name: string;
  /** "…/groups/join/aB3xY9" */
  linkLabel: string;
  memberCount: number;
  sharedSpoolCount: number;
  ownerName: string | null;
  /** Already in it: open the group instead of joining again. */
  alreadyMember?: boolean;
  groupHref: string;
  onJoin: () => void;
  joining?: boolean;
};

/** /groups/join/[code] (JoinGroup board): a standalone invite card. */
function JoinGroupCard({
  name,
  linkLabel,
  memberCount,
  sharedSpoolCount,
  ownerName,
  alreadyMember,
  groupHref,
  onJoin,
  joining,
}: JoinGroupCardProps) {
  return (
    <article
      data-slot="join-group-card"
      aria-labelledby="join-group-title"
      className="border-ink bg-card shadow-dialog w-full max-w-md rounded-[8px] border"
    >
      <div className="border-ink border-b-2 px-6 pt-5 pb-4">
        <p className="kicker truncate">{linkLabel}</p>
        <p className="kicker text-accent mt-3">Group invite</p>
        <h1 id="join-group-title" className="display-h2 mt-1">
          Join “{name}”?
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {alreadyMember
            ? 'You’re already a member of this group.'
            : 'You’ve been invited to join this group and share spools with its members.'}
        </p>
      </div>
      <div className="flex flex-col px-6 py-4">
        <KeyValueRow label="Members">{memberCount}</KeyValueRow>
        <KeyValueRow label="Shared spools">{sharedSpoolCount}</KeyValueRow>
        {ownerName && <KeyValueRow label="Owner">{ownerName}</KeyValueRow>}
      </div>
      <div className="bg-muted/50 border-border flex justify-end gap-2 rounded-b-[8px] border-t px-6 py-3">
        <Link href="/groups" className={buttonVariants({ variant: 'ghost' })}>
          Cancel
        </Link>
        {alreadyMember ? (
          <Link href={groupHref} className={buttonVariants()}>
            Open group
          </Link>
        ) : (
          <Button onClick={onJoin} disabled={joining}>
            {joining ? 'Joining…' : 'Join group'}
          </Button>
        )}
      </div>
    </article>
  );
}

export { JoinGroupCard };
