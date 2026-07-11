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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateMaterial } from '@/app/actions/materials';
import { FILAMENT_TYPES } from '@/lib/filament';
import type { Material } from '@/lib/db/schema';
import { toast } from 'sonner';

export function EditMaterialDialog({
  material,
  open,
  onOpenChange,
}: {
  material: Material;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const router = useRouter();
  const [manufacturer, setManufacturer] = useState(material.manufacturer);
  const [name, setName] = useState(material.name);
  const [filamentType, setFilamentType] = useState(material.filamentType);
  const [color, setColor] = useState(material.color ?? '#94a3b8');
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
        material.status === 'rejected'
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
            {material.status === 'rejected'
              ? 'Saving resubmits this material as pending for re-review.'
              : "Only you can see this until it's approved."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-m-manufacturer">Manufacturer</Label>
            <Input
              id="edit-m-manufacturer"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-m-name">Material name</Label>
            <Input
              id="edit-m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-m-type">Type</Label>
              <Select
                value={filamentType}
                onValueChange={(v) => v && setFilamentType(v)}
              >
                <SelectTrigger id="edit-m-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILAMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
