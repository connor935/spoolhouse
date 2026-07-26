'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Manufacturer + name input pair shared by the material/spool-type request
// forms (standalone pages, inline "request new" mini-forms) and edit
// dialogs. `layout` switches between the standalone/dialog stacked pair and
// the inline mini-forms' 2-column grid; `size` switches label/input sizing
// to match.
export function ManufacturerNameFields({
  idPrefix,
  manufacturer,
  onManufacturerChange,
  name,
  onNameChange,
  nameLabel = 'Name',
  manufacturerPlaceholder,
  namePlaceholder,
  required = false,
  layout = 'stacked',
  size = 'default',
}: {
  idPrefix: string;
  manufacturer: string;
  onManufacturerChange: (value: string) => void;
  name: string;
  onNameChange: (value: string) => void;
  nameLabel?: string;
  manufacturerPlaceholder?: string;
  namePlaceholder?: string;
  required?: boolean;
  layout?: 'stacked' | 'grid';
  size?: 'default' | 'sm';
}) {
  const fieldGap = size === 'sm' ? 'gap-1.5' : 'gap-2';
  const labelClassName = size === 'sm' ? 'text-xs' : undefined;
  const inputClassName = size === 'sm' ? 'h-8' : undefined;

  return (
    <div
      className={layout === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-4'}
    >
      <div className={cn('flex flex-col', fieldGap)}>
        <Label htmlFor={`${idPrefix}-manufacturer`} className={labelClassName}>
          Manufacturer
        </Label>
        <Input
          id={`${idPrefix}-manufacturer`}
          required={required}
          value={manufacturer}
          onChange={(e) => onManufacturerChange(e.target.value)}
          placeholder={manufacturerPlaceholder}
          className={inputClassName}
        />
      </div>
      <div className={cn('flex flex-col', fieldGap)}>
        <Label htmlFor={`${idPrefix}-name`} className={labelClassName}>
          {nameLabel}
        </Label>
        <Input
          id={`${idPrefix}-name`}
          required={required}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={namePlaceholder}
          className={inputClassName}
        />
      </div>
    </div>
  );
}
