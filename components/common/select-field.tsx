'use client';

import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Every Select in the app repeats `items={X}` (so SelectValue can resolve the
// label) AND re-maps X into <SelectItem> children — this wraps that pair.
export function SelectField<T extends string>({
  items,
  value,
  onValueChange,
  id,
  ariaLabel,
  triggerClassName,
}: {
  items: readonly { value: T; label: ReactNode }[];
  value: T;
  onValueChange: (value: T) => void;
  id?: string;
  ariaLabel?: string;
  triggerClassName?: string;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
    >
      <SelectTrigger
        id={id}
        className={triggerClassName}
        aria-label={ariaLabel}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
