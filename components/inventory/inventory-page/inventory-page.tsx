'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { markDried, setMeasuredWeight } from '@/app/actions/filaments';
import type { FilterProperty } from '@/components/common/filter-fields';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { Material, SpoolType } from '@/lib/db/schema';
import {
  formatWeight,
  type MaterialInventory,
  type SpoolView,
} from '@/lib/filament';
import { inventorySearch, type InventoryQuery } from '@/lib/inventory-params';
import type { MaterialPropertyView } from '@/lib/material-properties';

import { InventoryView } from '../inventory-view';
import { ReweighPopover } from '../reweigh-popover';
import { ReweighSheet } from '../reweigh-sheet';
import { SpoolEditor } from '../spool-editor';
import { spoolNumber } from '../spool-tile';

type InventoryPageProps = {
  inventory: MaterialInventory[];
  initialQuery: InventoryQuery;
  spoolTypes: SpoolType[];
  properties: FilterProperty[];
  propertiesByMaterialId: Record<string, MaterialPropertyView[]>;
  forecastDaysByMaterial: Record<string, number | null>;
  requestedBy: Record<string, string>;
  tagUidBySpoolId: Record<string, string>;
  isAdmin: boolean;
};

type Editing = {
  spool: SpoolView | null;
  material: Material | null;
  /** Bumped per open so the editor remounts with fresh fields. */
  instance: number;
};

// Spools come oldest-first per material, which is what numbers them.
function numberOf(inventory: MaterialInventory[], spool: SpoolView): number {
  const entry = inventory.find((m) => m.material.id === spool.materialId);
  return (entry?.spools.findIndex((s) => s.id === spool.id) ?? -1) + 1;
}

/** /inventory container: URL state, re-weigh, Dry?, add/edit spool. */
export function InventoryPage({
  inventory,
  initialQuery,
  spoolTypes,
  properties,
  propertiesByMaterialId,
  forecastDaysByMaterial,
  requestedBy,
  tagUidBySpoolId,
  isAdmin,
}: InventoryPageProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [query, setQuery] = useState(initialQuery);
  // A client navigation to another /inventory link (sidebar, shared link)
  // re-renders with new params but keeps this state; adopt them. Not a `key`
  // on the page: after replaceState every router.refresh() would remount it
  // and close the open editor.
  const initialSearch = inventorySearch(initialQuery);
  const [seenSearch, setSeenSearch] = useState(initialSearch);
  if (initialSearch !== seenSearch) {
    setSeenSearch(initialSearch);
    setQuery(initialQuery);
  }
  const [reweighId, setReweighId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [anchors, setAnchors] = useState<Record<string, HTMLDivElement>>({});
  const tiles = useRef(new Map<string, HTMLDivElement>());

  // replaceState: no navigation per keystroke, the back button stays sane,
  // and the current view is a shareable link.
  useEffect(() => {
    window.history.replaceState(
      null,
      '',
      `/inventory${inventorySearch(query)}`
    );
  }, [query]);

  // Looked up by id so a refresh after saving shows the fresh weight.
  const reweighSpool = useMemo(
    () =>
      reweighId
        ? (inventory.flatMap((m) => m.spools).find((s) => s.id === reweighId) ??
          null)
        : null,
    [inventory, reweighId]
  );
  const reweighMaterial = reweighSpool
    ? (inventory.find((m) => m.material.id === reweighSpool.materialId)
        ?.material ?? null)
    : null;

  const locations = useMemo(
    () =>
      [
        ...new Set(
          inventory.flatMap((m) =>
            m.spools.flatMap((s) => (s.location ? [s.location] : []))
          )
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [inventory]
  );

  function openEditor(spool: SpoolView | null, material: Material | null) {
    setReweighId(null);
    setEditing((e) => ({ spool, material, instance: (e?.instance ?? 0) + 1 }));
    setEditorOpen(true);
  }

  function selectSpool(spool: SpoolView) {
    // Snapshot the tile for the popover anchor; refs aren't read in render.
    const tile = tiles.current.get(spool.id);
    if (tile) setAnchors({ [spool.id]: tile });
    setReweighId(spool.id);
  }

  async function saveWeight(grams: number) {
    if (!reweighSpool) return;
    try {
      setSaving(true);
      await setMeasuredWeight(reweighSpool.id, grams);
      toast.success(`Weighed — ${formatWeight(grams)} total`);
      setReweighId(null);
      router.refresh();
    } catch {
      toast.error('Could not save the weight. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function dried(spool: SpoolView) {
    try {
      await markDried(spool.id);
      toast.success('Marked as dried today');
      router.refresh();
    } catch {
      toast.error('Could not mark the spool as dried');
    }
  }

  const reweighProps = reweighSpool && {
    open: true,
    onOpenChange: (open: boolean) => {
      if (!open) setReweighId(null);
    },
    title: `Re-weigh ${spoolNumber(numberOf(inventory, reweighSpool))} ${reweighMaterial?.name ?? ''}`,
    spool: reweighSpool,
    pending: saving,
    onSave: saveWeight,
    onEditDetails: () => openEditor(reweighSpool, reweighMaterial),
  };

  return (
    <>
      <InventoryView
        inventory={inventory}
        query={query}
        onQueryChange={setQuery}
        properties={properties}
        propertiesByMaterialId={propertiesByMaterialId}
        forecastDaysByMaterial={forecastDaysByMaterial}
        requestedBy={requestedBy}
        layout={isMobile ? 'mobile' : 'desktop'}
        selectedSpoolId={reweighId}
        onAddSpool={(material) => openEditor(null, material)}
        onSelectSpool={selectSpool}
        onEditSpool={openEditor}
        onMarkDried={dried}
        onOpenMaterial={(material) =>
          router.push(`/materials/${material.id}?from=inventory`)
        }
        tileRef={(id, el) => {
          if (el) tiles.current.set(id, el);
          else tiles.current.delete(id);
        }}
      />

      {reweighProps &&
        (isMobile ? (
          <ReweighSheet {...reweighProps} />
        ) : (
          <ReweighPopover
            {...reweighProps}
            anchor={anchors[reweighProps.spool.id] ?? null}
          />
        ))}

      {editing && (
        <SpoolEditor
          key={editing.instance}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          spool={editing.spool}
          number={editing.spool ? numberOf(inventory, editing.spool) : null}
          tagUid={
            editing.spool ? (tagUidBySpoolId[editing.spool.id] ?? null) : null
          }
          initialMaterial={editing.material}
          spoolTypes={spoolTypes}
          locations={locations}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}
