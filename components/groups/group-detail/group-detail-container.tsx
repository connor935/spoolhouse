'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  deleteGroup,
  leaveGroup,
  removeMember,
  renameGroup,
  rotateInviteCode,
  updateShareSettings,
} from '@/app/actions/groups';
import {
  cancelLendRequest,
  markReturned,
  requestLend,
} from '@/app/actions/lends';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useAsyncAction, useKeyedAsyncAction } from '@/hooks/use-async-action';
import { useConfirm } from '@/hooks/use-confirm';
import { monthYear } from '@/lib/dates';
import { shareCountsByOwner } from '@/lib/group-stock';
import { LEND_ERROR, LEND_TOAST } from '@/lib/lend-toast';
import type { SharedSpool } from '@/lib/sharing';
import { GroupSettingsView } from '../group-settings-view';
import { GroupStockView } from '../group-stock-view';
import {
  shareModePreview,
  type ShareableMaterial,
  type ShareMode,
} from '../share-mode-picker';
import { GroupDetail, type GroupView } from './group-detail';

type Member = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  joinedAt: Date;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Wires /groups/[id] to the lend and group actions. */
function GroupDetailContainer({
  group,
  members,
  stock,
  spoolNumbers,
  currentUserId,
  share,
  ownMaterials,
  activeLendCount,
  activeLendsByUserId,
  view,
}: {
  group: { id: string; name: string; inviteCode: string };
  members: Member[];
  stock: SharedSpool[];
  spoolNumbers: Record<string, number>;
  currentUserId: string;
  share: { mode: ShareMode; overrideIds: string[] };
  ownMaterials: ShareableMaterial[];
  activeLendCount: number;
  activeLendsByUserId: Record<string, number>;
  view: GroupView;
}) {
  const router = useRouter();
  const lend = useKeyedAsyncAction<string>();
  const member = useKeyedAsyncAction<string>();
  const sharing = useAsyncAction();
  const rename = useAsyncAction();
  const rotate = useAsyncAction();
  const danger = useAsyncAction();
  const { confirm, dialogProps } = useConfirm();

  // The origin is only known in the browser; set after mount so the server
  // and first client render agree.
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const inviteLink = `${origin}/groups/join/${group.inviteCode}`;

  const href = `/groups/${group.id}`;
  const shareCounts = useMemo(() => shareCountsByOwner(stock), [stock]);
  const materialCount = new Set(stock.map((s) => s.material.id)).size;
  const isOwner = members.some(
    (m) => m.id === currentUserId && m.role === 'owner'
  );
  const toGroups = () => router.push('/groups');

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy — select the code instead');
    }
  };

  return (
    <>
      <GroupDetail
        name={group.name}
        members={members.map((m) => ({
          id: m.id,
          name: m.name,
          you: m.id === currentUserId,
        }))}
        meta={[
          plural(members.length, 'member'),
          plural(stock.length, 'shared spool'),
          plural(materialCount, 'material'),
        ].join(' · ')}
        inviteCode={group.inviteCode}
        onCopyInvite={copyInvite}
        view={view}
        href={href}
      >
        {view === 'stock' ? (
          <GroupStockView
            stock={stock}
            spoolNumbers={spoolNumbers}
            currentUserId={currentUserId}
            members={members.map((m) => ({
              id: m.id,
              name: m.name,
              role: m.role,
              sharedCount: shareCounts.get(m.id) ?? 0,
            }))}
            mySharing={{
              mode: share.mode,
              ...shareModePreview(share.mode, share.overrideIds, ownMaterials),
            }}
            settingsHref={`${href}?view=settings`}
            pendingId={lend.pendingKey}
            onRequest={(spoolId) =>
              lend.run(spoolId, () => requestLend(spoolId, group.id), {
                success: LEND_TOAST.requested,
                error: LEND_ERROR.requested,
              })
            }
            onCancelRequest={(s) =>
              s.pendingRequest &&
              lend.run(
                s.id,
                () => cancelLendRequest(s.pendingRequest!.lendId),
                {
                  success: LEND_TOAST.cancelled,
                  error: LEND_ERROR.cancelled,
                }
              )
            }
            onMarkReturned={(s) =>
              s.lentTo &&
              lend.run(s.id, () => markReturned(s.lentTo!.lendId), {
                success: LEND_TOAST.returned,
                error: LEND_ERROR.returned,
              })
            }
          />
        ) : (
          <GroupSettingsView
            groupName={group.name}
            currentUserId={currentUserId}
            isOwner={isOwner}
            sharing={{ mode: share.mode, selectedIds: share.overrideIds }}
            materials={ownMaterials}
            savingSharing={sharing.pending}
            onSaveSharing={(mode, ids) =>
              sharing.run(() => updateShareSettings(group.id, mode, ids), {
                success: 'Sharing settings saved',
                error: 'Could not save sharing settings',
              })
            }
            inviteCode={group.inviteCode}
            inviteLink={inviteLink}
            rotating={rotate.pending}
            onRotate={() =>
              rotate.run(() => rotateInviteCode(group.id), {
                success: 'Invite code rotated — the old link no longer works',
                error: 'Could not rotate invite code',
              })
            }
            onCopied={() => toast.success('Invite link copied')}
            onCopyError={() =>
              toast.error('Could not copy — select the link instead')
            }
            renaming={rename.pending}
            onRename={(name) =>
              rename.run(() => renameGroup(group.id, name), {
                success: 'Group renamed',
                error: 'Could not rename group',
              })
            }
            members={members.map((m) => {
              const lends = activeLendsByUserId[m.id] ?? 0;
              return {
                id: m.id,
                name: m.name,
                role: m.role,
                activeLends: lends,
                meta: [
                  `joined ${monthYear(m.joinedAt)}`,
                  `shares ${shareCounts.get(m.id) ?? 0}`,
                  lends > 0 && plural(lends, 'active lend'),
                ]
                  .filter(Boolean)
                  .join(' · '),
              };
            })}
            removingId={member.pendingKey}
            onRemove={async (id) => {
              const name = members.find((m) => m.id === id)?.name ?? 'member';
              const ok = await confirm({
                title: `Remove ${name}?`,
                description:
                  'Their shared spools leave the group; open requests on them are declined.',
                confirmLabel: 'Remove',
                destructive: true,
              });
              if (ok)
                member.run(id, () => removeMember(group.id, id), {
                  success: 'Member removed',
                  error:
                    'Could not remove member — mark their active lends returned first',
                });
            }}
            groupActiveLends={activeLendCount}
            leavingOrDeleting={danger.pending}
            onDelete={async () => {
              const ok = await confirm({
                title: `Delete ${group.name}?`,
                description: `Removes the group for all ${plural(members.length, 'member')}. Spools stay with their owners.`,
                confirmLabel: 'Delete group',
                destructive: true,
              });
              if (ok)
                danger.run(() => deleteGroup(group.id), {
                  success: 'Group deleted',
                  error:
                    'Could not delete group — mark its active lends returned first',
                  refresh: false,
                  resetOnSuccess: false,
                  onSuccess: toGroups,
                });
            }}
            onLeave={async () => {
              const ok = await confirm({
                title: `Leave ${group.name}?`,
                description:
                  'Your shared spools disappear from this group. You can rejoin with an invite.',
                confirmLabel: 'Leave group',
                destructive: true,
              });
              if (ok)
                danger.run(() => leaveGroup(group.id), {
                  success: `Left ${group.name}`,
                  error:
                    'Could not leave — one of your lends here is still active',
                  refresh: false,
                  resetOnSuccess: false,
                  onSuccess: toGroups,
                });
            }}
          />
        )}
      </GroupDetail>
      <ConfirmDialog {...dialogProps} />
    </>
  );
}

export { GroupDetailContainer };
