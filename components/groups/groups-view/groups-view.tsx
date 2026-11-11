'use client';

import { useState } from 'react';
import type { AvatarPerson } from '@/components/common/avatar-stack';
import { PageHeader } from '@/components/common/page-header';
import { SectionHeader } from '@/components/common/section-header';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GroupCard, type GroupRole } from '../group-card';

export type GroupsViewGroup = {
  id: string;
  name: string;
  role: GroupRole;
  members: AvatarPerson[];
  sharedSpoolCount: number;
  youShareCount: number;
};

type GroupsViewProps = {
  groups: GroupsViewGroup[];
  onCreate: (name: string) => void;
  onJoin: (code: string) => void;
  creating?: boolean;
  joining?: boolean;
};

/** One-field form (Create / Join): submits the trimmed value. */
function SingleFieldForm({
  id,
  label,
  placeholder,
  submitLabel,
  help,
  pending,
  onSubmit,
}: {
  id: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  help: string;
  pending?: boolean;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  const trimmed = value.trim();
  return (
    <form
      className="flex max-w-md flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) onSubmit(trimmed);
      }}
    >
      <Field>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <div className="flex gap-2">
          <Input
            id={id}
            value={value}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="submit" disabled={!trimmed || pending}>
            {submitLabel}
          </Button>
        </div>
        <FieldDescription>{help}</FieldDescription>
      </Field>
    </form>
  );
}

/** The /groups page (Groups board): your groups, create one, join one. */
function GroupsView({
  groups,
  onCreate,
  onJoin,
  creating,
  joining,
}: GroupsViewProps) {
  const shared = groups.reduce((sum, g) => sum + g.sharedSpoolCount, 0);
  return (
    <div data-slot="groups-view" className="flex flex-col gap-9">
      <PageHeader
        index="04"
        kicker="Groups"
        meta={`${groups.length} group${groups.length === 1 ? '' : 's'} · ${shared} shared spools`}
        title="Groups"
        description="Invite-only groups for sharing and lending spools with people nearby."
      />

      <section aria-labelledby="groups-yours">
        <SectionHeader id="groups-yours" index="01" title="Your groups" />
        {groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You&apos;re not in any groups yet. Create one or join with an invite
            code.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-3.5">
            {groups.map((g) => (
              <GroupCard
                key={g.id}
                name={g.name}
                href={`/groups/${g.id}`}
                role={g.role}
                members={g.members}
                sharedSpoolCount={g.sharedSpoolCount}
                youShareCount={g.youShareCount}
              />
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-x-10 gap-y-9">
        <section
          aria-labelledby="groups-create"
          className="min-w-0 flex-[1_1_360px]"
        >
          <SectionHeader id="groups-create" index="02" title="Create a group" />
          <SingleFieldForm
            id="group-name"
            label="Group name"
            placeholder="e.g. Print Farm Friends"
            submitLabel="Create"
            help="You become the owner and get an invite link to share."
            pending={creating}
            onSubmit={onCreate}
          />
        </section>
        <section
          aria-labelledby="groups-join"
          className="min-w-0 flex-[1_1_360px]"
        >
          <SectionHeader id="groups-join" index="03" title="Join a group" />
          <SingleFieldForm
            id="invite-code"
            label="Invite code"
            placeholder="aB3xY9"
            submitLabel="Join"
            help="Got a link instead? Just open it — it lands on the join page."
            pending={joining}
            onSubmit={onJoin}
          />
        </section>
      </div>
    </div>
  );
}

export { GroupsView };
