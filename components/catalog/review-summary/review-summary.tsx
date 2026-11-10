import type { ComponentProps } from 'react';

import { KeyValueRow } from '@/components/common/key-value-row';
import { StatusBadge } from '@/components/common/status-badge';
import { Swatch } from '@/components/inventory/swatch';
import { Badge } from '@/components/ui/badge';
import type { Material } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

type ReviewSummaryProps = Omit<ComponentProps<'div'>, 'children'> & {
  material: Pick<
    Material,
    'manufacturer' | 'name' | 'filamentType' | 'color' | 'status'
  >;
  /** Approved materials already listed for this manufacturer; 0 = new manufacturer. */
  manufacturerMaterialCount: number;
  /** Who requested it; null for imported entries. */
  submitter: { name: string; trusted: boolean } | null;
  /** Preformatted age of the request, e.g. "2 h ago". */
  submittedAgo: string;
  /** Spools already on this entry, and their owners' names. */
  spoolCount: number;
  spoolOwners?: readonly string[];
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

function statusOf(status: string) {
  return status === 'approved' || status === 'rejected' ? status : 'pending';
}

/**
 * The entry under review on the ReviewQueue board: big swatch and name, then
 * the facts a reviewer decides on as key-value rows. Review actions are the
 * page's (they carry keyboard shortcuts).
 */
function ReviewSummary({
  material,
  manufacturerMaterialCount,
  submitter,
  submittedAgo,
  spoolCount,
  spoolOwners = [],
  className,
  ...props
}: ReviewSummaryProps) {
  const hex = material.color?.toUpperCase() ?? null;
  const label = (text: string) => <span className="kicker">{text}</span>;
  const aside = (text: string) => (
    <span className="kicker ml-1.5">{text}</span>
  );

  return (
    <div
      data-slot="review-summary"
      className={cn('flex flex-col', className)}
      {...props}
    >
      <div className="flex items-center gap-5 p-[22px]">
        <Swatch
          color={material.color}
          decorative
          className="size-[88px] border-2"
        />
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="display-h2 text-[40px]">{material.name}</h2>
            <Badge className="h-[22px]">{material.filamentType}</Badge>
            <StatusBadge status={statusOf(material.status)} />
          </div>
          <span className="kicker text-foreground">
            {[material.manufacturer, hex].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>
      <div className="px-6 pt-2 pb-1">
        <KeyValueRow label={label('Manufacturer')}>
          {material.manufacturer}
          {aside(
            manufacturerMaterialCount > 0
              ? `existing · ${plural(manufacturerMaterialCount, 'material', 'materials')}`
              : 'new manufacturer'
          )}
        </KeyValueRow>
        <KeyValueRow label={label('Material name')}>{material.name}</KeyValueRow>
        <KeyValueRow label={label('Type')}>
          <Badge>{material.filamentType}</Badge>
        </KeyValueRow>
        <KeyValueRow label={label('Color')}>
          {hex ? (
            <span className="flex items-center gap-2 font-mono">
              <Swatch color={hex} decorative />
              {hex}
            </span>
          ) : (
            <span className="text-muted-foreground">No colour set</span>
          )}
        </KeyValueRow>
        <KeyValueRow label={label('Submitted')}>
          {submitter ? (
            <>
              {submitter.name}
              {aside(
                `${submittedAgo} · ${submitter.trusted ? 'trusted contributor' : 'not a trusted contributor'}`
              )}
            </>
          ) : (
            <>
              Imported
              {aside(submittedAgo)}
            </>
          )}
        </KeyValueRow>
        <KeyValueRow label={label('In use')}>
          {spoolCount === 0
            ? 'Not in use'
            : plural(spoolCount, 'spool', 'spools') +
              (spoolOwners.length > 0 ? ` (${spoolOwners.join(', ')})` : '')}
        </KeyValueRow>
      </div>
    </div>
  );
}

export { ReviewSummary };
