import type { ComponentProps } from 'react';

import { Swatch } from '@/components/inventory/swatch';
import { Badge } from '@/components/ui/badge';
import type { Material } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

export type DuplicateReason = 'same-name' | 'close-color' | 'similar';

const REASONS: Record<
  DuplicateReason,
  { label: string; variant: 'accent' | 'muted' }
> = {
  'same-name': { label: 'Same name', variant: 'accent' },
  'close-color': { label: 'Close color', variant: 'accent' },
  similar: { label: 'Similar', variant: 'muted' },
};

type DuplicateCandidateRowProps = Omit<ComponentProps<'div'>, 'children'> & {
  material: Pick<
    Material,
    'manufacturer' | 'name' | 'color' | 'filamentType' | 'status'
  >;
  /** Why it looks like the entry under review. */
  reason: DuplicateReason;
  /** Colour distance to the entry under review (CIE ΔE); shown with one decimal. */
  deltaE?: number | null;
  /** Spools on the candidate, so the reviewer sees which one is established. */
  spoolCount?: number;
  /** Opens the candidate. */
  href?: string;
};

/**
 * One "Possible duplicates" line of the ReviewQueue board (`.rowline`):
 * swatch, manufacturer · name, a meta line and the reason tag.
 */
function DuplicateCandidateRow({
  material,
  reason,
  deltaE,
  spoolCount,
  href,
  className,
  ...props
}: DuplicateCandidateRowProps) {
  const { label, variant } = REASONS[reason];
  const meta = [
    material.filamentType,
    material.status,
    spoolCount !== undefined &&
      `${spoolCount} ${spoolCount === 1 ? 'spool' : 'spools'}`,
    deltaE != null && `ΔE ${deltaE.toFixed(1)}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const name = (
    <>
      {/* The space sits outside the span so it survives in the link's name. */}
      <span className="text-muted-foreground">
        {material.manufacturer} ·
      </span>{' '}
      {material.name}
    </>
  );
  return (
    <div
      data-slot="duplicate-candidate-row"
      data-reason={reason}
      className={cn(
        'border-border flex items-center gap-3 border-t py-3 first:border-t-0 first:pt-0',
        className
      )}
      {...props}
    >
      <Swatch color={material.color} decorative />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {href ? (
          <a
            href={href}
            className="truncate underline-offset-2 outline-none hover:underline focus-visible:underline"
          >
            {name}
          </a>
        ) : (
          <span className="truncate">{name}</span>
        )}
        <span className="kicker">{meta}</span>
      </span>
      <Badge variant={variant}>{label}</Badge>
    </div>
  );
}

export { DuplicateCandidateRow };
