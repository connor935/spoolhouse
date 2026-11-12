import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  AvatarStack,
  type AvatarPerson,
} from '@/components/common/avatar-stack';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type GroupView = 'stock' | 'settings';

type GroupDetailProps = {
  name: string;
  members: AvatarPerson[];
  /** "5 members · 23 shared spools · 15 materials" */
  meta: string;
  inviteCode: string;
  onCopyInvite: () => void;
  view: GroupView;
  /** `/groups/<id>`; Settings is `?view=settings` on it. */
  href: string;
  /** The Stock or Settings view. */
  children: ReactNode;
};

/**
 * /groups/[id] frame (Group / GroupSettings boards): title, members, invite
 * code and the Stock / Settings switch. The views are URL state, so a
 * settings link can be shared and the back button works.
 */
function GroupDetail({
  name,
  members,
  meta,
  inviteCode,
  onCopyInvite,
  view,
  href,
  children,
}: GroupDetailProps) {
  const tabs: { view: GroupView; label: string; href: string }[] = [
    { view: 'stock', label: 'Stock', href },
    { view: 'settings', label: 'Settings', href: `${href}?view=settings` },
  ];
  return (
    <div data-slot="group-detail" className="flex flex-col gap-6">
      <PageHeader
        index="04"
        breadcrumb={[{ label: 'Groups', href: '/groups' }, { label: name }]}
        title={name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <AvatarStack people={members} label={`Members of ${name}`} />
            <span className="kicker">{meta}</span>
          </span>
        }
        actions={
          <div className="border-ink bg-card flex items-center gap-3 rounded-[4px] border border-dashed py-2 pr-2 pl-3.5">
            <span className="flex flex-col gap-[3px]">
              <span className="kicker">Invite code</span>
              <span
                data-slot="invite-code"
                className="font-mono text-lg font-semibold tracking-[0.08em]"
              >
                {inviteCode}
              </span>
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label="Copy invite link"
              onClick={onCopyInvite}
            >
              Copy
            </Button>
          </div>
        }
      />
      <nav
        aria-label="Group sections"
        className="border-border flex gap-1 border-b"
      >
        {tabs.map((t) => (
          <Link
            key={t.view}
            href={t.href}
            aria-current={t.view === view ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              t.view === view
                ? 'border-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

export { GroupDetail };
