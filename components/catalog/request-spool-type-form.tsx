'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ManufacturerNameFields } from '@/components/manufacturer-name-fields';
import { RequestSubmitButton } from '@/components/request-submit-button';
import { requestSpoolType } from '@/app/actions/spool-types';
import { requestEntityToast } from '@/lib/request-entity-toast';
import { toast } from 'sonner';

export function RequestSpoolTypeForm({
  isAdmin = false,
}: {
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [manufacturer, setManufacturer] = useState('');
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emptyWeightGrams = Number.parseInt(grams, 10);
    if (Number.isNaN(emptyWeightGrams) || emptyWeightGrams <= 0) {
      toast.error('Empty spool weight must be greater than 0 g');
      return;
    }
    setPending(true);
    try {
      const created = await requestSpoolType({
        manufacturer: manufacturer.trim(),
        name: name.trim(),
        emptyWeightGrams,
      });
      requestEntityToast('Spool type', created);
      setManufacturer('');
      setName('');
      setGrams('');
      router.refresh();
    } catch {
      toast.error('Could not request spool type');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4 sm:max-w-sm">
      <ManufacturerNameFields
        idPrefix="st"
        manufacturer={manufacturer}
        onManufacturerChange={setManufacturer}
        name={name}
        onNameChange={setName}
        nameLabel="Spool name"
        manufacturerPlaceholder="e.g. Prusament"
        namePlaceholder="e.g. Cardboard 1kg"
        required
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="st-grams">Empty spool weight (g)</Label>
        <Input
          id="st-grams"
          type="number"
          step="1"
          min="1"
          required
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
        />
      </div>
      <RequestSubmitButton
        isAdmin={isAdmin}
        pending={pending}
        noun="spool type"
        className="self-start"
      />
    </form>
  );
}
