'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  createSpool,
  deleteSpool,
  getSpoolWeighings,
  undoLastWeighing,
  updateSpool,
} from '@/app/actions/filaments';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useConfirm } from '@/hooks/use-confirm';
import { useIsMobile } from '@/hooks/use-is-mobile';
import type { Material, SpoolType } from '@/lib/db/schema';
import {
  formatWeight,
  parsePriceCents,
  priceInputValue,
  type SpoolView,
} from '@/lib/filament';

import {
  SpoolDetailsFields,
  type SpoolDetailsValue,
} from '../spool-details-fields';
import { SpoolFormFrame } from '../spool-form-frame';
import { spoolNumber } from '../spool-tile';
import { SpoolWeightFields } from '../spool-weight-fields';
import {
  WeighingHistoryList,
  type WeighingRow,
} from '../weighing-history-list';
import { MaterialField } from './spool-form-material-field';
import { SpoolTypeField } from './spool-form-spool-type-field';

type SpoolEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The spool to edit; null/undefined adds a new one. */
  spool?: SpoolView | null;
  /** Edit: the spool's position within its material, for the kicker. */
  number?: number | null;
  /** Edit: the spool's NFC tag id (shown read-only). */
  tagUid?: string | null;
  /**
   * The material to start from — the spool's own when editing, or the one
   * whose "+ Spool" tile was clicked. An object, not an id: the picker searches
   * the catalog server-side and holds no list to look one up in.
   */
  initialMaterial?: Material | null;
  spoolTypes: SpoolType[];
  /** The user's existing storage locations, offered as suggestions. */
  locations?: string[];
  isAdmin?: boolean;
  /** Add mode's header kicker; names the page the editor opened from. */
  addKicker?: string;
};

// Date-input value ('YYYY-MM-DD') of a timestamp, '' for none.
function dateInputValue(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

/**
 * Add / edit spool: wires the presentational form parts to the spool actions.
 * A dialog on desktop, a bottom sheet on mobile. Mount it with a fresh `key`
 * per open so the fields start from the given spool.
 */
export function SpoolEditor({
  open,
  onOpenChange,
  spool,
  number,
  tagUid,
  initialMaterial,
  spoolTypes,
  locations = [],
  isAdmin = false,
  addKicker = '02 — Inventory / New spool',
}: SpoolEditorProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const editing = Boolean(spool);
  const { confirm, dialogProps } = useConfirm();

  const [material, setMaterial] = useState<Material | null>(
    initialMaterial ?? null
  );
  const [spoolType, setSpoolType] = useState<SpoolType | null>(() =>
    spool ? (spoolTypes.find((t) => t.id === spool.spoolTypeId) ?? null) : null
  );
  const [fullGrams, setFullGrams] = useState(
    spool ? String(spool.fullFilamentWeightGrams) : '1000'
  );
  const [measuredGrams, setMeasuredGrams] = useState(
    spool ? String(spool.measuredTotalWeightGrams) : '1200'
  );
  // Add: the total follows "full + empty spool" until typed in by hand.
  const [measuredDirty, setMeasuredDirty] = useState(false);
  const initialDried = dateInputValue(spool?.lastDriedAt ?? null);
  const [details, setDetails] = useState<SpoolDetailsValue>({
    price: priceInputValue(spool?.pricePaidCents ?? null),
    purchasedAt: spool?.purchasedAt ?? '',
    location: spool?.location ?? '',
    lastDried: initialDried,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [weighings, setWeighings] = useState<WeighingRow[] | null>(null);
  const [undoing, setUndoing] = useState(false);

  const emptyWeight = spoolType?.emptyWeightGrams ?? null;
  useEffect(() => {
    if (editing || measuredDirty || emptyWeight === null) return;
    const full = Number.parseInt(fullGrams, 10);
    if (Number.isNaN(full)) return;
    setMeasuredGrams(String(full + emptyWeight));
  }, [editing, measuredDirty, fullGrams, emptyWeight]);

  const spoolId = spool?.id;
  useEffect(() => {
    if (!spoolId || !open) return;
    let cancelled = false;
    getSpoolWeighings(spoolId)
      .then((rows) => !cancelled && setWeighings(rows))
      .catch(() => !cancelled && setWeighings([]));
    return () => {
      cancelled = true;
    };
  }, [spoolId, open]);

  // Static messages, shown in the footer: the server's own are masked in
  // production builds.
  function validate() {
    const full = Number.parseInt(fullGrams, 10);
    const measured = Number.parseInt(measuredGrams, 10);
    const pricePaidCents = parsePriceCents(details.price);
    if (!material) return 'Pick a material (or request a new one)';
    if (!spoolType) return 'Pick a spool type (or request a new one)';
    if (Number.isNaN(full) || full <= 0)
      return 'Full filament weight must be greater than 0 g';
    if (Number.isNaN(measured) || measured < spoolType.emptyWeightGrams)
      return "Measured weight can't be less than the empty spool weight";
    if (pricePaidCents === undefined)
      return 'Enter the price as a number, e.g. 19.99';
    return {
      materialId: material.id,
      spoolTypeId: spoolType.id,
      fullFilamentWeightGrams: full,
      measuredTotalWeightGrams: measured,
      pricePaidCents,
      purchasedAt: details.purchasedAt || null,
      location: details.location.trim() || null,
      // Only sent when changed: the date input drops the time of day, and an
      // unrelated edit must not move a "dried just now" stamp to midnight.
      ...(details.lastDried !== initialDried && {
        lastDriedAt: details.lastDried
          ? new Date(details.lastDried).toISOString()
          : null,
      }),
    };
  }

  async function handleSubmit() {
    const payload = validate();
    if (typeof payload === 'string') {
      setError(payload);
      return;
    }
    setError(null);
    try {
      setSaving(true);
      if (spool) {
        await updateSpool(spool.id, payload);
        toast.success('Spool updated');
      } else {
        await createSpool(payload);
        toast.success('Spool added to warehouse');
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!spool) return;
    const ok = await confirm({
      title: 'Delete this spool?',
      description: 'This can’t be undone.',
      confirmLabel: 'Delete spool',
      destructive: true,
    });
    if (!ok) return;
    try {
      setDeleting(true);
      await deleteSpool(spool.id);
      toast.success('Spool deleted');
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error('Could not delete spool');
      setDeleting(false);
    }
  }

  async function handleUndo() {
    if (!spool) return;
    try {
      setUndoing(true);
      const grams = await undoLastWeighing(spool.id);
      setWeighings(await getSpoolWeighings(spool.id));
      setMeasuredGrams(String(grams));
      toast.success(`Weight restored to ${formatWeight(grams)} total`);
      router.refresh();
    } catch {
      toast.error('Could not undo the last weighing');
    } finally {
      setUndoing(false);
    }
  }

  const kicker = spool
    ? [initialMaterial?.name, number ? spoolNumber(number) : null]
        .filter(Boolean)
        .join(' / ')
    : addKicker;

  return (
    <>
      <SpoolFormFrame
        open={open}
        onOpenChange={onOpenChange}
        mode={editing ? 'edit' : 'add'}
        variant={isMobile ? 'sheet' : 'dialog'}
        kicker={kicker}
        error={error}
        saving={saving}
        deleting={deleting}
        onDelete={editing ? handleDelete : undefined}
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <MaterialField
            value={material}
            onChange={setMaterial}
            isAdmin={isAdmin}
          />
          <SpoolTypeField
            spoolTypes={spoolTypes}
            value={spoolType}
            onChange={setSpoolType}
            defaultManufacturer={material?.manufacturer ?? ''}
            isAdmin={isAdmin}
          />
        </div>
        <SpoolWeightFields
          fullGrams={fullGrams}
          measuredGrams={measuredGrams}
          onFullGramsChange={setFullGrams}
          onMeasuredGramsChange={(v) => {
            setMeasuredDirty(true);
            setMeasuredGrams(v);
          }}
          emptyWeightGrams={emptyWeight}
          prefilled={!editing && !measuredDirty}
          editing={editing}
        />
        <SpoolDetailsFields
          value={details}
          onChange={setDetails}
          locations={locations}
          tagUid={tagUid}
          heading={!editing}
        />
        {spool && (
          <WeighingHistoryList
            weighings={weighings}
            emptyWeightGrams={spool.emptyWeightGrams}
            onUndo={handleUndo}
            undoing={undoing}
          />
        )}
      </SpoolFormFrame>
      <ConfirmDialog {...dialogProps} />
    </>
  );
}
