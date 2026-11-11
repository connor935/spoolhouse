'use client';

import { useRouter } from 'next/navigation';
import { joinGroup } from '@/app/actions/groups';
import { useAsyncAction } from '@/hooks/use-async-action';
import { JoinGroupCard } from './join-group-card';

type Preview = {
  id: string;
  name: string;
  memberCount: number;
  sharedSpoolCount: number;
  ownerName: string | null;
  alreadyMember: boolean;
};

/** Wires the join card: join by the link's code, then open the group. */
function JoinGroupContainer({
  code,
  preview,
}: {
  code: string;
  preview: Preview;
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const groupHref = `/groups/${preview.id}`;
  return (
    <JoinGroupCard
      {...preview}
      linkLabel={`…/groups/join/${code}`}
      groupHref={groupHref}
      joining={pending}
      onJoin={() =>
        run(() => joinGroup(code), {
          success: `Joined ${preview.name}`,
          error: 'Could not join group — the invite may have been rotated',
          refresh: false,
          resetOnSuccess: false,
          onSuccess: () => router.push(groupHref),
        })
      }
    />
  );
}

export { JoinGroupContainer };
