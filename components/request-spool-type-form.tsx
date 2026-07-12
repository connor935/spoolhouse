'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestSpoolType } from '@/app/actions/spool-types';
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
      toast.success(
        created.status === 'approved'
          ? 'Spool type added to the catalog'
          : 'Spool type requested — you can use it right away'
      );
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="st-manufacturer">Manufacturer</Label>
        <Input
          id="st-manufacturer"
          required
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          placeholder="e.g. Prusament"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="st-name">Spool name</Label>
        <Input
          id="st-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Cardboard 1kg"
        />
      </div>
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
      <Button type="submit" disabled={pending} className="self-start">
        {pending
          ? isAdmin
            ? 'Adding…'
            : 'Requesting…'
          : isAdmin
            ? 'Add spool type'
            : 'Request spool type'}
      </Button>
    </form>
  );
}
