'use client';

import type React from 'react';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Trash2 } from 'lucide-react';
import { createSpool, deleteSpool, updateSpool } from '@/app/actions/filaments';
import { MaterialField } from '@/components/dashboard/spool-form/spool-form-material-field';
import { SpoolTypeField } from '@/components/dashboard/spool-form/spool-form-spool-type-field';
import { WeighingHistory } from '@/components/dashboard/spool-form/weighing-history';
import {
  computeFilamentLeft,
  formatWeight,
  parsePriceCents,
  priceInputValue,
  type SpoolView,
} from '@/lib/filament';
import type { Material, SpoolType } from '@/lib/db/schema';
import { useConfirm } from '@/hooks/use-confirm';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spool?: SpoolView | null;
  // The material to start from — the spool's own when editing, or the one whose
  // card was clicked. Passed as an object rather than an id because the picker
  // no longer holds the whole catalog to look one up in.
  initialMaterial?: Material | null;
  spoolTypes: SpoolType[];
  // The user's existing storage locations, offered as suggestions
  locations?: string[];
  isAdmin?: boolean;
};

// Date-input value ('YYYY-MM-DD') of a timestamp, '' for none
function dateInputValue(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

export function SpoolFormDialog({
  open,
  onOpenChange,
  spool,
  initialMaterial,
  spoolTypes,
  locations = [],
  isAdmin = false,
}: Props) {
  const editing = Boolean(spool);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { confirm, dialogProps } = useConfirm();

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    initialMaterial ?? null
  );
  const [selectedType, setSelectedType] = useState<SpoolType | null>(() =>
    spool ? (spoolTypes.find((t) => t.id === spool.spoolTypeId) ?? null) : null
  );

  const [fullGrams, setFullGrams] = useState(
    spool ? String(spool.fullFilamentWeightGrams) : '1000'
  );
  const [measuredGrams, setMeasuredGrams] = useState(
    spool ? String(spool.measuredTotalWeightGrams) : '1200'
  );
  const [price, setPrice] = useState(
    priceInputValue(spool?.pricePaidCents ?? null)
  );
  const [purchasedAt, setPurchasedAt] = useState(spool?.purchasedAt ?? '');
  const [location, setLocation] = useState(spool?.location ?? '');
  const initialDried = dateInputValue(spool?.lastDriedAt ?? null);
  const [lastDried, setLastDried] = useState(initialDried);
  // in create mode the measured weight auto-fills as full + empty spool
  // weight until the user edits the field manually (then their value wins).
  const [measuredDirty, setMeasuredDirty] = useState(false);

  const emptyWeight = selectedType?.emptyWeightGrams ?? null;
  useEffect(() => {
    if (editing || measuredDirty || emptyWeight === null) return;
    const full = Number.parseInt(fullGrams, 10);
    if (Number.isNaN(full)) return;
    setMeasuredGrams(String(full + emptyWeight));
  }, [editing, measuredDirty, fullGrams, emptyWeight]);

  // Live computed preview of how much filament is actually left
  const measured = Number.parseInt(measuredGrams, 10);
  const previewLeft =
    selectedType && !Number.isNaN(measured)
      ? computeFilamentLeft(measured, selectedType.emptyWeightGrams)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const full = Number.parseInt(fullGrams, 10);
    const measuredTotal = Number.parseInt(measuredGrams, 10);

    if (!selectedMaterial) {
      toast.error('Pick a material (or request a new one)');
      return;
    }
    if (!selectedType) {
      toast.error('Pick a spool type (or request a new one)');
      return;
    }
    if (Number.isNaN(full) || full <= 0) {
      toast.error('Full filament weight must be greater than 0 g');
      return;
    }
    if (
      Number.isNaN(measuredTotal) ||
      measuredTotal < selectedType.emptyWeightGrams
    ) {
      toast.error("Measured weight can't be less than the empty spool weight");
      return;
    }

    const pricePaidCents = parsePriceCents(price);
    if (pricePaidCents === undefined) {
      toast.error('Enter the price as a number, e.g. 19.99');
      return;
    }

    const payload = {
      materialId: selectedMaterial.id,
      spoolTypeId: selectedType.id,
      fullFilamentWeightGrams: full,
      measuredTotalWeightGrams: measuredTotal,
      pricePaidCents,
      purchasedAt: purchasedAt || null,
      location: location.trim() || null,
      // Only sent when changed: the date input drops the time of day, and an
      // unrelated edit must not move a "dried just now" stamp to midnight.
      ...(lastDried !== initialDried && {
        lastDriedAt: lastDried ? new Date(lastDried).toISOString() : null,
      }),
    };

    try {
      setSaving(true);
      if (editing && spool) {
        await updateSpool(spool.id, payload);
        toast.success('Spool updated');
      } else {
        await createSpool(payload);
        toast.success('Spool added to warehouse');
      }
      onOpenChange(false);
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
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      setDeleting(true);
      await deleteSpool(spool.id);
      toast.success('Spool deleted');
      onOpenChange(false);
    } catch {
      toast.error('Could not delete spool');
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit spool' : 'Add new spool'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update this physical spool.'
                : 'Register a physical spool of a material. Remaining filament is calculated from the weighed total.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <MaterialField
              value={selectedMaterial}
              onChange={setSelectedMaterial}
              isAdmin={isAdmin}
            />

            <SpoolTypeField
              spoolTypes={spoolTypes}
              value={selectedType}
              onChange={setSelectedType}
              defaultManufacturer={selectedMaterial?.manufacturer ?? ''}
              isAdmin={isAdmin}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="fullFilamentWeight">
                  Full filament weight (g)
                </Label>
                <Input
                  id="fullFilamentWeight"
                  type="number"
                  step="1"
                  min="0"
                  value={fullGrams}
                  onChange={(e) => setFullGrams(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Filament on a new spool, e.g. 1000 g.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="measuredTotalWeight">
                  Measured total weight (g)
                </Label>
                <Input
                  id="measuredTotalWeight"
                  type="number"
                  step="1"
                  min="0"
                  value={measuredGrams}
                  onChange={(e) => {
                    setMeasuredDirty(true);
                    setMeasuredGrams(e.target.value);
                  }}
                />
                <p className="text-muted-foreground text-xs">
                  {editing || measuredDirty
                    ? 'Put the whole spool on a scale and enter the value.'
                    : 'Prefilled for a fresh spool (filament + empty spool) — adjust to your scale value.'}
                </p>
              </div>
            </div>

            <div className="border-border bg-secondary/50 flex items-center justify-between rounded-md border px-4 py-3">
              <span className="text-muted-foreground text-sm">
                Calculated filament left
              </span>
              <span className="text-card-foreground font-mono text-lg font-semibold tabular-nums">
                {previewLeft !== null ? formatWeight(previewLeft) : '—'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pricePaid">Price paid (€)</Label>
                <Input
                  id="pricePaid"
                  inputMode="decimal"
                  placeholder="optional"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="purchasedAt">Purchased</Label>
                <Input
                  id="purchasedAt"
                  type="date"
                  value={purchasedAt}
                  onChange={(e) => setPurchasedAt(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  list="spool-locations"
                  placeholder="e.g. Dry box 2"
                  maxLength={100}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <datalist id="spool-locations">
                  {locations.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastDried">Last dried</Label>
                <Input
                  id="lastDried"
                  type="date"
                  value={lastDried}
                  onChange={(e) => setLastDried(e.target.value)}
                />
              </div>
            </div>

            {editing && spool && (
              <WeighingHistory
                spoolId={spool.id}
                emptyWeightGrams={spool.emptyWeightGrams}
                onUndone={(grams) => setMeasuredGrams(String(grams))}
              />
            )}

            <DialogFooter className="mt-2">
              {editing && spool && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="sm:mr-auto"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {deleting ? 'Deleting…' : 'Delete spool'}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || deleting}>
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Add spool'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...dialogProps} />
    </>
  );
}
