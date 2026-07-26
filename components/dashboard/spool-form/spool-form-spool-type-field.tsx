'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ManufacturerNameFields } from '@/components/common/manufacturer-name-fields';
import { RequestSubmitButton } from '@/components/common/request-submit-button';
import { Plus, X } from 'lucide-react';
import { requestSpoolType } from '@/app/actions/spool-types';
import { requestEntityToast } from '@/lib/request-entity-toast';
import { SpoolTypePicker } from '@/components/dashboard/spool-form/spool-type-picker';
import type { SpoolType } from '@/lib/db/schema';
import { toast } from 'sonner';

type Props = {
  spoolTypes: SpoolType[];
  value: SpoolType | null;
  onChange: (spoolType: SpoolType | null) => void;
  // Prefills the manufacturer field of the request form (from the material)
  defaultManufacturer?: string;
  // Admins skip the review queue — flips the request copy to "add".
  isAdmin?: boolean;
};

// Spool-type picker with an inline "request new spool type" mini-form. Owns
// the spool types it requested this session and merges them into the select.
export function SpoolTypeField({
  spoolTypes,
  value,
  onChange,
  defaultManufacturer = '',
  isAdmin = false,
}: Props) {
  const [extras, setExtras] = useState<SpoolType[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [manufacturer, setManufacturer] = useState('');
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('');
  const [pending, setPending] = useState(false);

  const all = useMemo(() => {
    const seen = new Set(spoolTypes.map((t) => t.id));
    return [...spoolTypes, ...extras.filter((t) => !seen.has(t.id))];
  }, [spoolTypes, extras]);

  function openRequest() {
    setRequesting(true);
    setManufacturer(defaultManufacturer);
  }

  async function handleRequest() {
    const emptyWeightGrams = Number.parseInt(grams, 10);
    if (!manufacturer.trim() || !name.trim()) {
      toast.error('Manufacturer and name are required');
      return;
    }
    if (Number.isNaN(emptyWeightGrams) || emptyWeightGrams <= 0) {
      toast.error('Empty spool weight must be greater than 0 g');
      return;
    }
    try {
      setPending(true);
      const created = await requestSpoolType({
        manufacturer: manufacturer.trim(),
        name: name.trim(),
        emptyWeightGrams,
      });
      setExtras((prev) => [...prev, created]);
      onChange(created);
      setRequesting(false);
      setManufacturer('');
      setName('');
      setGrams('');
      requestEntityToast('Spool type', created);
    } catch {
      toast.error('Could not request spool type');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="spoolType">Spool type</Label>
        {!requesting && (
          <button
            type="button"
            onClick={openRequest}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            {isAdmin ? 'Add new' : 'Request new'}
          </button>
        )}
      </div>
      <SpoolTypePicker
        id="spoolType"
        spoolTypes={all}
        value={value}
        onChange={onChange}
        manufacturer={defaultManufacturer}
      />
      <p className="text-muted-foreground text-xs">
        Determines the empty spool weight
        {value ? `: ${value.emptyWeightGrams} g` : '.'}
      </p>

      {requesting && (
        <div className="border-border bg-secondary/50 flex flex-col gap-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {isAdmin ? 'Add new spool type' : 'Request new spool type'}
            </span>
            <button
              type="button"
              onClick={() => setRequesting(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close request form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ManufacturerNameFields
            idPrefix="req"
            manufacturer={manufacturer}
            onManufacturerChange={setManufacturer}
            name={name}
            onNameChange={setName}
            nameLabel="Spool name"
            manufacturerPlaceholder="e.g. Prusament"
            namePlaceholder="e.g. Cardboard 1kg"
            layout="grid"
            size="sm"
          />
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="reqGrams" className="text-xs">
                Empty spool weight (g)
              </Label>
              <Input
                id="reqGrams"
                type="number"
                step="1"
                min="1"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="h-8"
              />
            </div>
            <RequestSubmitButton
              isAdmin={isAdmin}
              pending={pending}
              size="sm"
              onClick={handleRequest}
            />
          </div>
        </div>
      )}
    </div>
  );
}
