'use client';

import * as React from 'react';

import { approveMaterial, rejectMaterial } from '@/app/actions/materials';
import { approveSpoolType, rejectSpoolType } from '@/app/actions/spool-types';
import { EditMaterialDialog } from '@/components/catalog/edit-material-dialog';
import { EditSpoolTypeDialog } from '@/components/catalog/edit-spool-type-dialog';
import { useAsyncAction } from '@/hooks/use-async-action';
import type {
  DuplicateMatch,
  SpoolTypeDuplicateMatch,
} from '@/lib/catalog-duplicates';
import type { ReviewQueue as ReviewQueueData } from '@/lib/catalog-review';
import type { Material, SpoolType } from '@/lib/db/schema';
import { formatWeight } from '@/lib/filament';
import { formatAgoShort } from '@/lib/relative-time';

import { ReviewQueue } from './review-queue';

type Shared = {
  /** Server render time, so ages hydrate identically. */
  now: Date;
};

const skipHref = (
  base: string,
  data: { pendingCount: number; position: number }
) => (data.pendingCount > 1 ? `${base}?skip=${data.position + 1}` : null);

// Approve and reject leave the entry's slot in the queue to the next one, so
// a refresh at the same `skip` shows what comes next. Until that entry has
// arrived the decided one stays locked, so a quick second click can't hit it.
// Reject asks no confirmation here: approving it from the table undoes it.
function useDecision(currentId: string | undefined) {
  const action = useAsyncAction();
  const [decidedId, setDecidedId] = React.useState<string | null>(null);
  function decide(
    id: string,
    fn: () => Promise<void>,
    messages: { success: string; error: string }
  ) {
    return action.run(fn, { ...messages, onSuccess: () => setDecidedId(id) });
  }
  return {
    busy: action.pending || (decidedId !== null && decidedId === currentId),
    decide,
  };
}
function MaterialReviewContainer({
  data,
  now,
}: Shared & { data: ReviewQueueData<Material, DuplicateMatch<Material>> }) {
  const [editing, setEditing] = React.useState(false);
  const current = data.current;
  const m = current?.row;
  const decision = useDecision(m?.id);

  return (
    <>
      <ReviewQueue
        title="Review queue"
        breadcrumb={[
          { label: 'Admin' },
          { label: 'Materials', href: '/admin/materials' },
          { label: 'Review' },
        ]}
        noun="material"
        pendingCount={data.pendingCount}
        position={data.position}
        summary={
          current && m
            ? {
                entry: { ...m, tag: m.filamentType },
                manufacturerEntryCount: current.manufacturerEntryCount,
                submitter: current.submitter,
                submittedAgo: formatAgoShort(m.createdAt, now),
                spoolCount: current.spoolCount,
                spoolOwners: current.spoolOwners,
              }
            : undefined
        }
        duplicates={data.duplicates.map(({ match, spoolCount }) => ({
          id: match.candidate.id,
          entry: { ...match.candidate, detail: match.candidate.filamentType },
          reason: match.reason,
          deltaE: match.deltaE,
          spoolCount,
          href: `/materials/${match.candidate.id}?from=review`,
        }))}
        upNext={data.upNext.map((n) => ({
          id: n.id,
          manufacturer: n.manufacturer,
          name: n.name,
          color: n.color,
          tag: n.filamentType,
          submittedAgo: formatAgoShort(n.createdAt, now),
        }))}
        skipHref={skipHref('/admin/materials/review', data)}
        backHref="/admin/materials"
        busy={decision.busy}
        onApprove={() =>
          m &&
          decision.decide(m.id, () => approveMaterial(m.id), {
            success: `${m.name} approved`,
            error: 'Could not approve the material',
          })
        }
        onReject={() =>
          m &&
          decision.decide(m.id, () => rejectMaterial(m.id), {
            success: `${m.name} rejected`,
            error: 'Could not reject the material',
          })
        }
        onEdit={() => setEditing(true)}
      />
      {editing && m && (
        <EditMaterialDialog
          material={m}
          open
          onOpenChange={setEditing}
          isAdmin
        />
      )}
    </>
  );
}

function SpoolTypeReviewContainer({
  data,
  now,
}: Shared & {
  data: ReviewQueueData<SpoolType, SpoolTypeDuplicateMatch<SpoolType>>;
}) {
  const [editing, setEditing] = React.useState(false);
  const current = data.current;
  const t = current?.row;
  const decision = useDecision(t?.id);

  return (
    <>
      <ReviewQueue
        title="Review queue"
        breadcrumb={[
          { label: 'Admin' },
          { label: 'Spool types', href: '/admin/spool-types' },
          { label: 'Review' },
        ]}
        noun="spool type"
        pendingCount={data.pendingCount}
        position={data.position}
        summary={
          current && t
            ? {
                entry: { ...t, tag: formatWeight(t.emptyWeightGrams) },
                noun: 'spool type',
                tagLabel: 'Empty spool',
                manufacturerEntryCount: current.manufacturerEntryCount,
                submitter: current.submitter,
                submittedAgo: formatAgoShort(t.createdAt, now),
                spoolCount: current.spoolCount,
                spoolOwners: current.spoolOwners,
              }
            : undefined
        }
        duplicates={data.duplicates.map(({ match, spoolCount }) => ({
          id: match.candidate.id,
          entry: {
            ...match.candidate,
            detail: formatWeight(match.candidate.emptyWeightGrams),
          },
          reason: match.reason,
          spoolCount,
        }))}
        upNext={data.upNext.map((n) => ({
          id: n.id,
          manufacturer: n.manufacturer,
          name: n.name,
          tag: formatWeight(n.emptyWeightGrams),
          submittedAgo: formatAgoShort(n.createdAt, now),
        }))}
        skipHref={skipHref('/admin/spool-types/review', data)}
        backHref="/admin/spool-types"
        busy={decision.busy}
        onApprove={() =>
          t &&
          decision.decide(t.id, () => approveSpoolType(t.id), {
            success: `${t.name} approved`,
            error: 'Could not approve the spool type',
          })
        }
        onReject={() =>
          t &&
          decision.decide(t.id, () => rejectSpoolType(t.id), {
            success: `${t.name} rejected`,
            error: 'Could not reject the spool type',
          })
        }
        onEdit={() => setEditing(true)}
      />
      {editing && t && (
        <EditSpoolTypeDialog
          spoolType={t}
          open
          onOpenChange={setEditing}
          isAdmin
        />
      )}
    </>
  );
}

export { MaterialReviewContainer, SpoolTypeReviewContainer };
