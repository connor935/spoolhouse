'use client';

import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/select-field';
import { ManufacturerNameFields } from '@/components/manufacturer-name-fields';
import { RequestSubmitButton } from '@/components/request-submit-button';
import { Plus, X } from 'lucide-react';
import { requestMaterial } from '@/app/actions/materials';
import { requestEntityToast } from '@/lib/request-entity-toast';
import { MaterialPicker } from '@/components/warehouseDashboard/spoolForm/material-picker';
import { FILAMENT_TYPE_ITEMS } from '@/lib/catalog-filter-items';
import type { Material } from '@/lib/db/schema';
import { toast } from 'sonner';

type Props = {
  materials: Material[];
  value: Material | null;
  onChange: (material: Material | null) => void;
  // Admins skip the review queue — flips the request copy to "add".
  isAdmin?: boolean;
};

// Material picker with an inline "request new material" mini-form. Owns the
// materials it requested this session (immediately usable by the requester)
// and merges them into the select.
export function MaterialField({
  materials,
  value,
  onChange,
  isAdmin = false,
}: Props) {
  const [extras, setExtras] = useState<Material[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [manufacturer, setManufacturer] = useState('');
  const [name, setName] = useState('');
  const [filamentType, setFilamentType] = useState('PLA');
  const [color, setColor] = useState('#1c7ed6');
  const [pending, setPending] = useState(false);

  const all = useMemo(() => {
    const seen = new Set(materials.map((m) => m.id));
    return [...materials, ...extras.filter((m) => !seen.has(m.id))];
  }, [materials, extras]);

  async function handleRequest() {
    if (!manufacturer.trim() || !name.trim()) {
      toast.error('Manufacturer and name are required');
      return;
    }
    try {
      setPending(true);
      const created = await requestMaterial({
        manufacturer: manufacturer.trim(),
        name: name.trim(),
        filamentType,
        color,
      });
      setExtras((prev) => [...prev, created]);
      onChange(created);
      setRequesting(false);
      setManufacturer('');
      setName('');
      requestEntityToast('Material', created);
    } catch {
      toast.error('Could not request material');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="material">Material</Label>
        {!requesting && (
          <button
            type="button"
            onClick={() => setRequesting(true)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            {isAdmin ? 'Add new' : 'Request new'}
          </button>
        )}
      </div>
      <MaterialPicker
        id="material"
        materials={all}
        value={value}
        onChange={onChange}
      />

      {requesting && (
        <div className="border-border bg-secondary/50 flex flex-col gap-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {isAdmin ? 'Add new material' : 'Request new material'}
            </span>
            <button
              type="button"
              onClick={() => setRequesting(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close material request form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ManufacturerNameFields
            idPrefix="reqM"
            manufacturer={manufacturer}
            onManufacturerChange={setManufacturer}
            name={name}
            onNameChange={setName}
            nameLabel="Material name"
            manufacturerPlaceholder="e.g. Prusament"
            namePlaceholder="e.g. Galaxy Black"
            layout="grid"
            size="sm"
          />
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reqMType" className="text-xs">
                Type
              </Label>
              <SelectField
                id="reqMType"
                items={FILAMENT_TYPE_ITEMS}
                value={filamentType}
                onValueChange={setFilamentType}
                triggerClassName="h-8"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reqMColor" className="text-xs">
                Color
              </Label>
              <input
                id="reqMColor"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="border-input h-8 w-12 cursor-pointer rounded-md border bg-transparent p-1"
                aria-label="Material color"
              />
            </div>
            <RequestSubmitButton
              isAdmin={isAdmin}
              pending={pending}
              size="sm"
              onClick={handleRequest}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {isAdmin
              ? 'As an admin, this is added to the global catalog straight away.'
              : 'You can use it immediately; an admin will review it for the global catalog.'}
          </p>
        </div>
      )}
    </div>
  );
}
