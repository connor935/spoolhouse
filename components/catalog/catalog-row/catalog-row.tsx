import { ChevronRightIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import type { ReactNode } from 'react';

import { StatusBadge } from '@/components/common/status-badge';
import { Swatch } from '@/components/inventory/swatch';
import { WeightDisplay } from '@/components/inventory/weight-display';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Material, SpoolType } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

// The union lives in one prop rather than the props object itself, which
// keeps Storybook's arg types (and composeStories) working.
type CatalogRowEntry =
  | {
      kind: 'material';
      material: Pick<Material, 'name' | 'color' | 'filamentType' | 'status'>;
      /** The viewer's spools of this material ("In your stock · 3"). */
      stockCount?: number;
    }
  | {
      kind: 'spool-type';
      spoolType: Pick<SpoolType, 'name' | 'emptyWeightGrams' | 'status'>;
      /** Spools on this type, anyone's ("In use · 9"). */
      inUseCount?: number;
    };

type CatalogRowProps = {
  entry: CatalogRowEntry;
  /** The viewer submitted the entry: pending and rejected rows say what they may do. */
  own?: boolean;
  /** Opens the entry. The name becomes a link (`href`) or button (`onOpen`) covering the row. */
  href?: string;
  onOpen?: () => void;
  /** Admin slot, usually <CatalogRowActions>. Replaces the chevron and shows the approved status too. */
  actions?: ReactNode;
  /** Mobile material rows (CatalogMobile board): the hints stack under the name. */
  compact?: boolean;
  className?: string;
};

const OWN_HINT = {
  pending: 'yours · editable',
  rejected: 'yours · edit to resubmit',
} as const;

function StatusHints({
  status,
  own,
  showApproved,
}: {
  status: string;
  own?: boolean;
  showApproved: boolean;
}) {
  if (status !== 'pending' && status !== 'rejected') {
    return showApproved ? <StatusBadge status="approved" /> : null;
  }
  return (
    <>
      <StatusBadge status={status} />
      {own && <span className="kicker">{OWN_HINT[status]}</span>}
    </>
  );
}

// The name doubles as the row's link: its ::after covers the whole row, so the
// row is one click target while admin buttons (raised above it) stay separate.
function RowName({
  name,
  href,
  onOpen,
}: Pick<CatalogRowProps, 'href' | 'onOpen'> & { name: string }) {
  const base = 'min-w-0 truncate font-medium';
  const stretched =
    'outline-none underline-offset-2 hover:underline after:absolute after:inset-0 after:rounded-[2px] focus-visible:after:ring-2 focus-visible:after:ring-ring';
  if (href) {
    return (
      <a
        data-slot="catalog-row-name"
        href={href}
        className={cn(base, stretched)}
      >
        {name}
      </a>
    );
  }
  if (onOpen) {
    return (
      <button
        data-slot="catalog-row-name"
        type="button"
        onClick={onOpen}
        className={cn(base, stretched, 'text-left')}
      >
        {name}
      </button>
    );
  }
  return (
    <span data-slot="catalog-row-name" className={base}>
      {name}
    </span>
  );
}

function TrailingCell({
  actions,
  openable,
}: {
  actions?: ReactNode;
  openable: boolean;
}) {
  if (actions) {
    return <div className="relative z-10 justify-self-end">{actions}</div>;
  }
  return openable ? (
    <ChevronRightIcon
      aria-hidden
      className="text-muted-foreground size-4 justify-self-end"
    />
  ) : (
    <span />
  );
}

// Design language: `.crow` in .claude/design/spoolhouse.css (CatalogMaterials,
// CatalogSpoolTypes, CatalogMobile boards).
function CatalogRow({
  entry,
  own,
  href,
  onOpen,
  actions,
  compact = false,
  className,
}: CatalogRowProps) {
  const openable = Boolean(href || onOpen);
  const status =
    entry.kind === 'material' ? entry.material.status : entry.spoolType.status;
  const hints = (
    <StatusHints status={status} own={own} showApproved={Boolean(actions)} />
  );
  const root = cn(
    'border-border text-foreground relative grid items-center gap-3 border-b py-2.5',
    className
  );
  const data = { 'data-slot': 'catalog-row', 'data-status': status };

  if (entry.kind === 'spool-type') {
    const { spoolType, inUseCount = 0 } = entry;
    const hasTrailing = openable || Boolean(actions);
    return (
      <div
        {...data}
        data-variant="spool-type"
        className={cn(
          root,
          !hasTrailing && 'grid-cols-[minmax(0,1fr)_auto_auto]',
          hasTrailing &&
            (actions
              ? 'grid-cols-[minmax(0,1fr)_auto_auto_auto]'
              : 'grid-cols-[minmax(0,1fr)_auto_auto_20px]')
        )}
      >
        <RowName name={spoolType.name} href={href} onOpen={onOpen} />
        <span className="flex items-center gap-2">
          {hints}
          {inUseCount > 0 && (
            <Badge variant="accent">In use · {inUseCount}</Badge>
          )}
        </span>
        <WeightDisplay
          grams={spoolType.emptyWeightGrams}
          className="justify-self-end text-[20px]"
        />
        {hasTrailing && <TrailingCell actions={actions} openable={openable} />}
      </div>
    );
  }

  const { material, stockCount = 0 } = entry;
  const stock = stockCount > 0 && (
    <Badge variant="accent" className={cn(compact && 'self-start')}>
      In your stock · {stockCount}
    </Badge>
  );
  const typeTag = <Badge>{material.filamentType}</Badge>;
  const swatch = <Swatch color={material.color} decorative />;

  if (compact) {
    const hasHints = stock || status === 'pending' || status === 'rejected';
    return (
      <div
        {...data}
        data-variant="material"
        className={cn(
          root,
          actions
            ? 'grid-cols-[18px_minmax(0,1fr)_auto_auto]'
            : 'grid-cols-[18px_minmax(0,1fr)_auto_16px]',
          'py-3'
        )}
      >
        {swatch}
        <span className="flex min-w-0 flex-col gap-1">
          <RowName name={material.name} href={href} onOpen={onOpen} />
          {hasHints && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {hints}
              {stock}
            </span>
          )}
        </span>
        {typeTag}
        <TrailingCell actions={actions} openable={openable} />
      </div>
    );
  }

  return (
    <div
      {...data}
      data-variant="material"
      className={cn(
        root,
        actions
          ? 'grid-cols-[22px_minmax(0,1fr)_auto_auto_auto]'
          : 'grid-cols-[22px_minmax(0,1fr)_auto_auto_20px]'
      )}
    >
      {swatch}
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <RowName name={material.name} href={href} onOpen={onOpen} />
        {hints}
      </span>
      {stock || <span />}
      {typeTag}
      <TrailingCell actions={actions} openable={openable} />
    </div>
  );
}

type CatalogRowActionsProps = {
  status: string;
  /** Entry name, for the buttons' accessible names ("Approve Galaxy Blue"). */
  name: string;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Why the entry can't be deleted, e.g. spools still use it. Disables Delete. */
  deleteBlockedReason?: string;
  /** Disables everything while an action is in flight. */
  busy?: boolean;
};

/**
 * Admin controls for a catalog row or table cell (AdminMaterials board).
 * Mirrors the server rules in lib/catalog.ts: Approve for anything not yet
 * approved, Reject only while pending. Omitted callbacks hide their button.
 */
function CatalogRowActions({
  status,
  name,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  deleteBlockedReason,
  busy = false,
}: CatalogRowActionsProps) {
  return (
    <span
      data-slot="catalog-row-actions"
      className="inline-flex items-center gap-1.5"
    >
      {onApprove && status !== 'approved' && (
        <Button
          size="sm"
          aria-label={`Approve ${name}`}
          disabled={busy}
          onClick={onApprove}
        >
          Approve
        </Button>
      )}
      {onReject && status === 'pending' && (
        <Button
          size="sm"
          variant="outline"
          aria-label={`Reject ${name}`}
          disabled={busy}
          onClick={onReject}
        >
          Reject
        </Button>
      )}
      {onEdit && (
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Edit ${name}`}
          disabled={busy}
          onClick={onEdit}
        >
          <PencilIcon />
        </Button>
      )}
      {onDelete && (
        // A disabled button gets no pointer events, so the reason sits on a wrapper.
        <span title={deleteBlockedReason} className="inline-flex">
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Delete ${name}`}
            disabled={busy || Boolean(deleteBlockedReason)}
            onClick={onDelete}
          >
            <Trash2Icon />
          </Button>
        </span>
      )}
    </span>
  );
}

export { CatalogRow, CatalogRowActions };
export type { CatalogRowEntry };
