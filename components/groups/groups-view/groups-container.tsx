'use client';

import { useRouter } from 'next/navigation';
import {
  createGroup,
  joinGroup,
  type GroupSummary,
} from '@/app/actions/groups';
import { useAsyncAction } from '@/hooks/use-async-action';
import { GroupsView } from './groups-view';

/** Wires /groups: create or join, then go to the group. */
function GroupsContainer({
  groups,
  userId,
}: {
  groups: GroupSummary[];
  userId: string;
}) {
  const router = useRouter();
  const create = useAsyncAction();
  const join = useAsyncAction();
  const open = (group: { id: string }) => router.push(`/groups/${group.id}`);

  return (
    <GroupsView
      groups={groups.map((g) => ({
        ...g,
        members: g.members.map((m) => ({ ...m, you: m.id === userId })),
      }))}
      creating={create.pending}
      joining={join.pending}
      onCreate={(name) =>
        create.run(() => createGroup(name), {
          success: 'Group created',
          error: 'Could not create group',
          refresh: false,
          resetOnSuccess: false,
          onSuccess: open,
        })
      }
      onJoin={(code) =>
        join.run(() => joinGroup(code), {
          success: 'Joined the group',
          error: 'Invalid invite code',
          refresh: false,
          resetOnSuccess: false,
          onSuccess: open,
        })
      }
    />
  );
}

export { GroupsContainer };
