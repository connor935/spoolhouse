'use client';

import * as React from 'react';

import { entryNote } from '@/components/catalog/material-entry-form';
import { Note } from '@/components/common/alert';
import { Button } from '@/components/ui/button';
import {
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type SpoolTypeEntryValues = {
  manufacturer: string;
  name: string;
  emptyWeightGrams: number;
};

type SpoolTypeEntryFormProps = {
  mode: 'request' | 'edit';
  autoApprove: boolean;
  status?: string;
  isAdmin?: boolean;
  defaultValues?: Partial<SpoolTypeEntryValues>;
  pending?: boolean;
  onSubmit: (values: SpoolTypeEntryValues) => void;
  onCancel?: () => void;
  className?: string;
};

/**
 * Request / add / edit form for a spool type (RequestForms board, middle
 * dialog): manufacturer, spool name and the empty weight, which must be a
 * positive number of grams — the same rule spoolTypeSchema enforces.
 */
function SpoolTypeEntryForm({
  mode,
  autoApprove,
  status,
  isAdmin = false,
  defaultValues,
  pending = false,
  onSubmit,
  onCancel,
  className,
}: SpoolTypeEntryFormProps) {
  const id = React.useId();
  const [manufacturer, setManufacturer] = React.useState(
    defaultValues?.manufacturer ?? ''
  );
  const [name, setName] = React.useState(defaultValues?.name ?? '');
  const [weight, setWeight] = React.useState(
    defaultValues?.emptyWeightGrams?.toString() ?? ''
  );
  const [touched, setTouched] = React.useState(false);
  const grams = Number(weight.replace(',', '.'));
  const weightValid =
    weight.trim() !== '' && Number.isFinite(grams) && grams > 0;
  const showError = touched && !weightValid;
  const flags = { mode, autoApprove, status, isAdmin };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!manufacturer.trim() || !name.trim() || !weightValid) return;
    onSubmit({
      manufacturer: manufacturer.trim(),
      name: name.trim(),
      emptyWeightGrams: Math.round(grams),
    });
  }

  return (
    <form
      data-slot="spool-type-entry-form"
      onSubmit={submit}
      className={cn('flex flex-col gap-4', className)}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-mfr`}>Manufacturer</Label>
        <Input
          id={`${id}-mfr`}
          required
          placeholder="e.g. Prusament"
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-name`}>Spool name</Label>
        <Input
          id={`${id}-name`}
          required
          placeholder="e.g. Cardboard 1 kg"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-weight`}>Empty spool weight (g)</Label>
        <InputGroup>
          <InputGroupInput
            id={`${id}-weight`}
            numeric
            inputMode="decimal"
            aria-invalid={showError ? true : undefined}
            aria-describedby={`${id}-weight-help`}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          <InputGroupAddon>g</InputGroupAddon>
        </InputGroup>
        <p
          id={`${id}-weight-help`}
          className={cn(
            'text-xs leading-snug',
            showError ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {showError
            ? 'Must be greater than 0 g.'
            : 'Weigh an empty spool of this type. Must be greater than 0 g.'}
        </p>
      </div>

      <Note>{entryNote(flags)}</Note>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending
            ? 'Saving…'
            : mode === 'request'
              ? autoApprove
                ? 'Add'
                : 'Request'
              : !isAdmin && status === 'rejected'
                ? 'Save & resubmit'
                : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

export { SpoolTypeEntryForm };
