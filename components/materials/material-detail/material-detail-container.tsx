'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { markDried, setMeasuredWeight } from '@/app/actions/filaments';
import { cancelLendRequest, requestLend } from '@/app/actions/lends';
import {
  approveMaterial,
  deleteMaterial,
  rejectMaterial,
} from '@/app/actions/materials';
import {
  deleteMaterialProperty,
  setMaterialProperty,
  verifyMaterialProperty,
} from '@/app/actions/properties';
import { EditMaterialDialog } from '@/components/catalog/edit-material-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import type { Crumb } from '@/components/common/page-header';
import { ReweighPopover } from '@/components/inventory/reweigh-popover';
import { ReweighSheet } from '@/components/inventory/reweigh-sheet';
import { SpoolEditor } from '@/components/inventory/spool-editor';
import { spoolNumber } from '@/components/inventory/spool-tile';
import { materialGroupStockKey } from '@/components/materials/material-group-stock-table';
import { useAsyncAction, useKeyedAsyncAction } from '@/hooks/use-async-action';
import { useConfirm } from '@/hooks/use-confirm';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { Material, Property, SpoolType } from '@/lib/db/schema';
import type { MaterialStockSummary, SpoolView } from '@/lib/filament';
import { LEND_TOAST } from '@/lib/lend-toast';
import type { MaterialGroupSpool } from '@/lib/material-detail';
import type { MaterialPropertyView } from '@/lib/material-properties';
import type { MaterialUsageHistory } from '@/lib/usage-stats';

import { MaterialDetail } from './material-detail';

type MaterialDetailContainerProps = {
  material: Material;
  breadcrumb?: Crumb[];
  viewer: { id: string; isAdmin: boolean };
  spoolCount: number;
  spools: SpoolView[];
  summary: MaterialStockSummary;
  usage: MaterialUsageHistory;
  propertyValues: MaterialPropertyView[];
  propertyDefinitions: Property[];
  groupStock: MaterialGroupSpool[];
  /** For the add/edit spool dialog. */
  spoolTypes: SpoolType[];
  locations: string[];
  /** NFC tag per spool id, shown read-only in the spool editor. */
  tagUidBySpoolId: Record<string, string>;
};

type Reweigh = { spoolId: string; number: number; anchor: HTMLElement };

// Wires the presentational MaterialDetail to the server actions and owns the
// overlays: re-weigh popover (sheet on phones), add/edit spool, edit material
// and confirmations. Every action re-checks auth server-side; the gating here
// only decides which controls to show.
function MaterialDetailContainer({
  material,
  breadcrumb,
  viewer,
  spoolCount,
  spools,
  summary,
  usage,
  propertyValues,
  propertyDefinitions,
  groupStock,
  spoolTypes,
  locations,
  tagUidBySpoolId,
}: MaterialDetailContainerProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();
  const review = useAsyncAction();
  const property = useAsyncAction();
  const spoolAction = useAsyncAction();
  const lend = useKeyedAsyncAction<string>();

  const [reweigh, setReweigh] = React.useState<Reweigh | null>(null);
  const [spoolForm, setSpoolForm] = React.useState<{
    open: boolean;
    spool: SpoolView | null;
    instance: number;
  }>({ open: false, spool: null, instance: 0 });
  const [editOpen, setEditOpen] = React.useState(false);

  // Looked up by id, so the open re-weigh follows router.refresh()'s fresh data.
  const reweighSpool = reweigh
    ? spools.find((s) => s.id === reweigh.spoolId)
    : undefined;

  function openSpoolForm(spool: SpoolView | null) {
    setReweigh(null);
    setSpoolForm((f) => ({ open: true, spool, instance: f.instance + 1 }));
  }

  async function saveWeight(grams: number) {
    if (!reweighSpool) return;
    await spoolAction.run(() => setMeasuredWeight(reweighSpool.id, grams), {
      success: 'Weight saved',
      error: 'Could not save the weight — check the value and try again',
      onSuccess: () => setReweigh(null),
    });
  }

  async function saveProperty(propertyId: string, value: string) {
    const result = await property.run(
      async () => {
        await setMaterialProperty({
          materialId: material.id,
          propertyId,
          value,
        });
        return true;
      },
      {
        success: 'Property saved',
        error: 'Could not save the property — check the value format',
      }
    );
    return result === true;
  }

  async function removeProperty(v: MaterialPropertyView) {
    const ok = await confirm({
      title: `Delete ${v.name}?`,
      description: 'Removes this datasheet value from the material.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await property.run(() => deleteMaterialProperty(v.id), {
      success: 'Property deleted',
      error: 'Could not delete the property',
    });
  }

  async function reject() {
    const ok = await confirm({
      title: `Reject ${material.name}?`,
      description:
        'It stays out of the global catalog. The submitter can still use it, and edit it to resubmit.',
      confirmLabel: 'Reject',
      destructive: true,
    });
    if (!ok) return;
    await review.run(() => rejectMaterial(material.id), {
      success: 'Material rejected',
      error: 'Could not reject the material',
    });
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete ${material.name}?`,
      description: 'Removes it from the catalog for everyone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await review.run(() => deleteMaterial(material.id), {
      success: 'Material deleted',
      error: 'Could not delete the material — is a spool using it?',
      refresh: false,
      resetOnSuccess: false,
      onSuccess: () => router.push('/admin/materials'),
    });
  }

  // Spools arrive oldest first, which is what numbers them (as on the tiles).
  const editedNumber = spoolForm.spool
    ? spools.findIndex((s) => s.id === spoolForm.spool!.id) + 1 || null
    : null;

  const reweighTitle = reweigh
    ? `Re-weigh ${spoolNumber(reweigh.number)} ${material.name}`
    : '';
  const closeReweigh = (open: boolean) => {
    if (!open) setReweigh(null);
  };

  return (
    <>
      <MaterialDetail
        material={material}
        breadcrumb={breadcrumb}
        isAdmin={viewer.isAdmin}
        own={material.submittedById === viewer.id}
        spoolCount={spoolCount}
        spools={spools}
        summary={summary}
        usage={usage}
        properties={{
          values: propertyValues,
          definitions: propertyDefinitions,
          isAdmin: viewer.isAdmin,
          pending: property.pending,
          onSave: saveProperty,
          onVerify: (v) =>
            property.run(() => verifyMaterialProperty(v.id), {
              success: 'Marked verified',
              error: 'Could not verify the value',
            }),
          onDelete: removeProperty,
        }}
        groupStock={{
          rows: groupStock,
          currentUserId: viewer.id,
          pendingKey: lend.pendingKey,
          onRequest: (row) =>
            lend.run(
              materialGroupStockKey(row),
              () => requestLend(row.spool.id, row.groupId),
              {
                success: LEND_TOAST.requested,
                error: 'Could not request the spool — it may no longer be free',
              }
            ),
          onCancelRequest: (row) => {
            const lendId = row.spool.pendingRequest?.lendId;
            if (!lendId) return;
            void lend.run(
              materialGroupStockKey(row),
              () => cancelLendRequest(lendId),
              {
                success: LEND_TOAST.cancelled,
                error: 'Could not cancel the request',
              }
            );
          },
        }}
        selectedSpoolId={reweigh?.spoolId ?? null}
        onSelectSpool={(spool, number, anchor) =>
          setReweigh({ spoolId: spool.id, number, anchor })
        }
        onEditSpool={openSpoolForm}
        onMarkDried={(spool) =>
          spoolAction.run(() => markDried(spool.id), {
            success: 'Marked as dried',
            error: 'Could not mark the spool as dried',
          })
        }
        onAddSpool={() => openSpoolForm(null)}
        onEdit={() => setEditOpen(true)}
        onApprove={() =>
          review.run(() => approveMaterial(material.id), {
            success: 'Material approved',
            error: 'Could not approve the material',
          })
        }
        onReject={reject}
        onDelete={remove}
        reviewPending={review.pending}
      />

      {reweigh &&
        reweighSpool &&
        (isMobile ? (
          <ReweighSheet
            open
            onOpenChange={closeReweigh}
            title={reweighTitle}
            spool={reweighSpool}
            pending={spoolAction.pending}
            onSave={saveWeight}
            onEditDetails={() => openSpoolForm(reweighSpool)}
          />
        ) : (
          <ReweighPopover
            open
            onOpenChange={closeReweigh}
            anchor={reweigh.anchor}
            title={reweighTitle}
            spool={reweighSpool}
            pending={spoolAction.pending}
            onSave={saveWeight}
            onEditDetails={() => openSpoolForm(reweighSpool)}
          />
        ))}

      <SpoolEditor
        key={`${spoolForm.spool?.id ?? 'create'}-${spoolForm.instance}`}
        open={spoolForm.open}
        onOpenChange={(open) => setSpoolForm((f) => ({ ...f, open }))}
        spool={spoolForm.spool}
        number={editedNumber}
        tagUid={
          spoolForm.spool ? (tagUidBySpoolId[spoolForm.spool.id] ?? null) : null
        }
        initialMaterial={material}
        spoolTypes={spoolTypes}
        locations={locations}
        isAdmin={viewer.isAdmin}
        addKicker="06 — Materials / New spool"
      />

      {editOpen && (
        <EditMaterialDialog
          material={material}
          open={editOpen}
          onOpenChange={setEditOpen}
          isAdmin={viewer.isAdmin}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </>
  );
}

export { MaterialDetailContainer };
