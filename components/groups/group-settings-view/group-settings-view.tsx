'use client';

import { useState } from 'react';
import { Alert } from '@/components/common/alert';
import { SectionHeader } from '@/components/common/section-header';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InviteCodeBox } from '../invite-code-box';
import { MemberRow } from '../member-row';
import {
  ShareModePicker,
  type ShareableMaterial,
  type ShareMode,
} from '../share-mode-picker';

export type SettingsMember = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  /** "joined Mar 2026 · shares 9 · 1 active lend" */
  meta: string;
  activeLends: number;
};

type GroupSettingsViewProps = {
  groupName: string;
  currentUserId: string;
  isOwner: boolean;
  sharing: { mode: ShareMode; selectedIds: string[] };
  materials: ShareableMaterial[];
  onSaveSharing: (mode: ShareMode, selectedIds: string[]) => void;
  savingSharing?: boolean;
  /** Owner only from here on. */
  inviteCode: string;
  inviteLink: string;
  onRotate: () => void;
  rotating?: boolean;
  onCopied?: () => void;
  onCopyError?: () => void;
  onRename: (name: string) => void;
  renaming?: boolean;
  members: SettingsMember[];
  onRemove: (memberId: string) => void;
  /** Member being removed. */
  removingId?: string | null;
  /** Active lends in the whole group: deleting is refused while any run. */
  groupActiveLends: number;
  onDelete: () => void;
  /** Members only; refused while you are part of an active lend. */
  onLeave: () => void;
  leavingOrDeleting?: boolean;
};

const ACTIVE_REASON = 'Mark active lends returned first';

/**
 * The group page's Settings view (GroupSettings board). Owners get rename,
 * invite link, members and delete; members get leave. Delete / leave /
 * remove are disabled while an active lend would make the server refuse.
 */
function GroupSettingsView(props: GroupSettingsViewProps) {
  const { isOwner, currentUserId, members } = props;
  const [mode, setMode] = useState(props.sharing.mode);
  const [selectedIds, setSelectedIds] = useState(props.sharing.selectedIds);
  const [name, setName] = useState(props.groupName);
  const me = members.find((m) => m.id === currentUserId);
  let n = 1;
  const index = () => String(n++).padStart(2, '0');

  return (
    <div
      data-slot="group-settings-view"
      className="flex max-w-3xl flex-col gap-9"
    >
      <section aria-labelledby="settings-sharing">
        <SectionHeader
          id="settings-sharing"
          index={index()}
          title="My sharing"
        />
        <ShareModePicker
          mode={mode}
          onModeChange={setMode}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          materials={props.materials}
          saving={props.savingSharing}
          onSave={() => props.onSaveSharing(mode, selectedIds)}
        />
      </section>

      {isOwner && (
        <>
          <section aria-labelledby="settings-name">
            <SectionHeader
              id="settings-name"
              index={index()}
              title="Group name"
            />
            <form
              className="flex max-w-md flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = name.trim();
                if (trimmed && trimmed !== props.groupName)
                  props.onRename(trimmed);
              }}
            >
              <Field>
                <FieldLabel htmlFor="group-rename">Name</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="group-rename"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={
                      !name.trim() ||
                      name.trim() === props.groupName ||
                      props.renaming
                    }
                  >
                    Rename
                  </Button>
                </div>
              </Field>
            </form>
          </section>

          <section aria-labelledby="settings-invite">
            <SectionHeader
              id="settings-invite"
              index={index()}
              title="Invite link"
            />
            <InviteCodeBox
              code={props.inviteCode}
              link={props.inviteLink}
              onRotate={props.onRotate}
              rotating={props.rotating}
              onCopied={props.onCopied}
              onCopyError={props.onCopyError}
            />
          </section>

          <section aria-labelledby="settings-members">
            <SectionHeader
              id="settings-members"
              index={index()}
              title="Members"
              aside={<span className="kicker">{members.length}</span>}
            />
            <ul className="flex flex-col">
              {members.map((m) => {
                const removable = m.role !== 'owner' && m.id !== currentUserId;
                return (
                  <MemberRow
                    key={m.id}
                    name={m.name}
                    role={m.role}
                    you={m.id === currentUserId}
                    meta={m.meta}
                    pending={props.removingId === m.id}
                    onRemove={
                      removable ? () => props.onRemove(m.id) : undefined
                    }
                    removeDisabledReason={
                      removable && m.activeLends > 0 ? ACTIVE_REASON : undefined
                    }
                  />
                );
              })}
            </ul>
          </section>
        </>
      )}

      <section aria-labelledby="settings-danger">
        <SectionHeader
          id="settings-danger"
          index={index()}
          title="Danger zone"
        />
        {isOwner ? (
          <DangerAction
            title="Delete group"
            description={`Removes the group for all ${members.length} members. Spools stay with their owners.`}
            label="Delete group"
            blocked={
              props.groupActiveLends > 0 &&
              'Could not delete group — mark its active lends returned first'
            }
            pending={props.leavingOrDeleting}
            onClick={props.onDelete}
          />
        ) : (
          <DangerAction
            title="Leave group"
            description="Your shared spools disappear from this group. You can rejoin with an invite."
            label="Leave group"
            blocked={
              (me?.activeLends ?? 0) > 0 &&
              'You can’t leave while one of your lends here is active — the owner marks it returned first'
            }
            pending={props.leavingOrDeleting}
            onClick={props.onLeave}
          />
        )}
      </section>
    </div>
  );
}

function DangerAction({
  title,
  description,
  label,
  blocked,
  pending,
  onClick,
}: {
  title: string;
  description: string;
  label: string;
  /** Why the server would refuse right now; disables the button. */
  blocked: string | false;
  pending?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-destructive flex flex-col gap-3 rounded-[4px] border border-dashed p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-sm font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <Button
          variant="destructive-outline"
          disabled={!!blocked || pending}
          onClick={onClick}
        >
          {label}
        </Button>
      </div>
      {blocked && <Alert>{blocked}</Alert>}
    </div>
  );
}

export { GroupSettingsView };
