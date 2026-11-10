import type { ComponentProps } from 'react';

import { Badge } from '@/components/ui/badge';

export type CatalogStatus =
  'approved' | 'pending' | 'rejected' | 'imported' | 'unverified';

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

// Tag styles as on the MaterialDetail, catalog and review boards.
const STATUS: Record<CatalogStatus, { variant: BadgeVariant; label: string }> =
  {
    approved: { variant: 'accent', label: 'Approved' },
    pending: { variant: 'muted', label: 'Pending review' },
    rejected: { variant: 'destructive-outline', label: 'Rejected' },
    imported: { variant: 'muted', label: 'Imported · SpoolmanDB' },
    unverified: { variant: 'muted', label: 'Unverified' },
  };

type StatusBadgeProps = Omit<ComponentProps<typeof Badge>, 'variant'> & {
  status: CatalogStatus;
};

/** Catalog-entry / property-value status. `children` overrides the label. */
function StatusBadge({ status, children, ...props }: StatusBadgeProps) {
  const { variant, label } = STATUS[status];
  return (
    <Badge variant={variant} data-status={status} {...props}>
      {children ?? label}
    </Badge>
  );
}

export { StatusBadge };
