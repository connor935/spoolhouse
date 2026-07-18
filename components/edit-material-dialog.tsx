'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/select-field';
import { ManufacturerNameFields } from '@/components/manufacturer-name-fields';
import { updateMaterial } from '@/app/actions/materials';
import { DEFAULT_MATERIAL_COLOR } from '@/lib/filament';
import { FILAMENT_TYPE_ITEMS } from '@/lib/catalog-filter-items';
import { describeReviewStatus } from '@/lib/describe-review-status';
import type { Material } from '@/lib/db/schema';
import { toast } from 'sonner';

export function EditMaterialDialog({
  material,
  open,
  onOpenChange,
  isAdmin = false,
}: {
  material: Material;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Admin edits keep the status; a submitter editing a rejected entry resubmits.
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [manufacturer, setManufacturer] = useState(material.manufacturer);
  const [name, setName] = useState(material.name);
  const [filamentType, setFilamentType] = useState(material.filamentType);
  const [color, setColor] = useState(material.color ?? DEFAULT_MATERIAL_COLOR);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manufacturer.trim() || !name.trim()) {
      toast.error('Manufacturer and name are required');
      return;
    }
    setSaving(true);
    try {
      await updateMaterial(material.id, {
        manufacturer: manufacturer.trim(),
        name: name.trim(),
        filamentType,
        color,
      });
      toast.success(
        !isAdmin && material.status === 'rejected'
          ? 'Resubmitted for review'
          : 'Material updated'
      );
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error('Could not update material');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit material</DialogTitle>
          <DialogDescription>
            {describeReviewStatus(isAdmin, material.status, 'material')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ManufacturerNameFields
            idPrefix="edit-m"
            manufacturer={manufacturer}
            onManufacturerChange={setManufacturer}
            name={name}
            onNameChange={setName}
            nameLabel="Material name"
          />
          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-m-type">Type</Label>
              <SelectField
                id="edit-m-type"
                items={FILAMENT_TYPE_ITEMS}
                value={filamentType}
                onValueChange={setFilamentType}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-m-color">Color</Label>
              <input
                id="edit-m-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="border-input h-9 w-14 cursor-pointer rounded-md border bg-transparent p-1"
                aria-label="Material color"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
