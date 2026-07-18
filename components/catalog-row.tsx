'use client';

import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useAsyncAction } from '@/hooks/use-async-action';
import { useConfirm } from '@/hooks/use-confirm';

type CatalogRowEntity = {
  id: string;
  name: string;
  manufacturer: string;
  status: string;
  submittedById: string | null;
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Shared row shell for the material & spool-type catalogs: pending/rejected
// badges, edit button, admin approve/reject (pending) + delete — driven by
// the specific catalog's server actions, copy and meta slot (color swatch /
// filament-type badge for materials, empty-weight text for spool types).
export function CatalogRow<T extends CatalogRowEntity>({
  entity,
  currentUserId,
  isAdmin = false,
  leading,
  meta,
  noun,
  spoolCount = 0,
  approve,
  reject,
  remove,
  renderEditDialog,
}: {
  entity: T;
  currentUserId: string;
  isAdmin?: boolean;
  leading?: ReactNode;
  meta: ReactNode;
  // e.g. "material" / "spool type" — used in the delete title/sr-only text
  // and (capitalized) the approve/reject/delete toast copy.
  noun: string;
  spoolCount?: number;
  approve: (id: string) => Promise<unknown>;
  reject: (id: string) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
  renderEditDialog: (
    open: boolean,
    onOpenChange: (open: boolean) => void
  ) => ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const { pending, run } = useAsyncAction();
  const { confirm, dialogProps } = useConfirm();
  const ownEditable =
    entity.status !== 'approved' && entity.submittedById === currentUserId;
  const canEdit = isAdmin || ownEditable;

  async function handleDelete() {
    const ok = await confirm({
      title: `Delete "${entity.manufacturer} — ${entity.name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await run(() => remove(entity.id), {
      success: `${capitalize(noun)} deleted`,
      resetOnSuccess: false,
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 px-6 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <span className="truncate">{entity.name}</span>
        {entity.status === 'pending' && (
          <Badge variant="outline" className="text-muted-foreground shrink-0">
            Pending review
          </Badge>
        )}
        {entity.status === 'rejected' &&
          (isAdmin || entity.submittedById === currentUserId) && (
            <Badge
              variant="outline"
              className="border-destructive/40 text-destructive shrink-0"
            >
              Rejected
            </Badge>
          )}
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isAdmin && entity.status === 'pending' && (
          <>
            <Button
              size="sm"
              className="h-7"
              onClick={() =>
                run(() => approve(entity.id), {
                  success: `${capitalize(noun)} approved`,
                  resetOnSuccess: false,
                })
              }
              disabled={pending}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              onClick={() =>
                run(() => reject(entity.id), {
                  success: `${capitalize(noun)} rejected`,
                  resetOnSuccess: false,
                })
              }
              disabled={pending}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Reject
            </Button>
          </>
        )}
        {meta}
        {isAdmin && (
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive h-7 w-7"
            onClick={handleDelete}
            disabled={pending || spoolCount > 0}
            title={
              spoolCount > 0 ? `In use by ${spoolCount} spool(s)` : `Delete ${noun}`
            }
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete {noun}</span>
          </Button>
        )}
      </div>

      {canEdit && renderEditDialog(editing, setEditing)}
      <ConfirmDialog {...dialogProps} />
    </li>
  );
}
