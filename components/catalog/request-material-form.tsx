'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/common/select-field';
import { ManufacturerNameFields } from '@/components/common/manufacturer-name-fields';
import { RequestSubmitButton } from '@/components/common/request-submit-button';
import { requestMaterial } from '@/app/actions/materials';
import { requestEntityToast } from '@/lib/request-entity-toast';
import { FILAMENT_TYPE_ITEMS } from '@/lib/catalog-filter-items';
import { toast } from 'sonner';

export function RequestMaterialForm({
  isAdmin = false,
}: {
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [manufacturer, setManufacturer] = useState('');
  const [name, setName] = useState('');
  const [filamentType, setFilamentType] = useState('PLA');
  const [color, setColor] = useState('#1c7ed6');
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const created = await requestMaterial({
        manufacturer: manufacturer.trim(),
        name: name.trim(),
        filamentType,
        color,
      });
      requestEntityToast('Material', created);
      setManufacturer('');
      setName('');
      router.refresh();
    } catch {
      toast.error('Could not request material');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4 sm:max-w-sm">
      <ManufacturerNameFields
        idPrefix="m"
        manufacturer={manufacturer}
        onManufacturerChange={setManufacturer}
        name={name}
        onNameChange={setName}
        nameLabel="Material name"
        manufacturerPlaceholder="e.g. Prusament"
        namePlaceholder="e.g. Galaxy Black"
        required
      />
      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="m-type">Type</Label>
          <SelectField
            id="m-type"
            items={FILAMENT_TYPE_ITEMS}
            value={filamentType}
            onValueChange={setFilamentType}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="m-color">Color</Label>
          <input
            id="m-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="border-input h-9 w-14 cursor-pointer rounded-md border bg-transparent p-1"
            aria-label="Material color"
          />
        </div>
      </div>
      <RequestSubmitButton
        isAdmin={isAdmin}
        pending={pending}
        noun="material"
        className="self-start"
      />
    </form>
  );
}
