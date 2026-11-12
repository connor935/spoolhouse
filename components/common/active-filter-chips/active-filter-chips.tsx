import { XIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { Badge } from '@/components/ui/badge';
import type { FilterChip } from '@/lib/filter-value';
import { cn } from '@/lib/utils';

type ActiveFilterChipsProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** Usually `filterChips(value, properties)`. Renders nothing when empty. */
  chips: readonly FilterChip[];
  /** Usually `onChange(removeFilterChip(value, id))`. */
  onRemove: (id: string) => void;
};

/** "Active" row of removable accent chips under the toolbar (CatalogMaterials). */
function ActiveFilterChips({
  chips,
  onRemove,
  className,
  ...props
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div
      data-slot="active-filter-chips"
      role="group"
      aria-label="Active filters"
      className={cn('flex flex-wrap items-center gap-2', className)}
      {...props}
    >
      <span aria-hidden className="kicker">
        Active
      </span>
      {chips.map((chip) => (
        <Badge key={chip.id} variant="accent" className="h-[22px] gap-1.5 pr-1">
          {chip.label}
          <button
            type="button"
            aria-label={`Remove filter ${chip.label}`}
            onClick={() => onRemove(chip.id)}
            className="hover:bg-accent/15 focus-visible:ring-ring grid size-3.5 cursor-pointer place-items-center rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-inset"
          >
            <XIcon aria-hidden className="size-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

export { ActiveFilterChips };
