'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EditSpoolTypeDialog } from '@/components/edit-spool-type-dialog';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import {
  approveSpoolType,
  deleteSpoolType,
  rejectSpoolType,
  type SpoolTypeWithUsage,
} from '@/app/actions/spool-types';
import type { SpoolType } from '@/lib/db/schema';
import { toast } from 'sonner';

export function SpoolTypeCatalogRow({
  spoolType,
  currentUserId,
  isAdmin = false,
}: {
  spoolType: SpoolType | SpoolTypeWithUsage;
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const ownEditable =
    spoolType.status !== 'approved' &&
    spoolType.submittedById === currentUserId;
  const canEdit = isAdmin || ownEditable;
  const spoolCount = 'spoolCount' in spoolType ? spoolType.spoolCount : 0;

  async function run(fn: () => Promise<void>, success: string) {
    setPending(true);
    try {
      await fn();
      toast.success(success);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
      setPending(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(`Delete "${spoolType.manufacturer} — ${spoolType.name}"?`)
    )
      return;
    await run(() => deleteSpoolType(spoolType.id), 'Spool type deleted');
  }

  return (
    <li className="flex items-center justify-between gap-3 px-6 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate">{spoolType.name}</span>
        {spoolType.status === 'pending' && (
          <Badge variant="outline" className="text-muted-foreground shrink-0">
            Pending review
          </Badge>
        )}
        {spoolType.status === 'rejected' &&
          (isAdmin || spoolType.submittedById === currentUserId) && (
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
        {isAdmin && spoolType.status === 'pending' && (
          <>
            <Button
              size="sm"
              className="h-7"
              onClick={() =>
                run(() => approveSpoolType(spoolType.id), 'Spool type approved')
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
                run(() => rejectSpoolType(spoolType.id), 'Spool type rejected')
              }
              disabled={pending}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Reject
            </Button>
          </>
        )}
        <span className="text-muted-foreground font-mono text-sm tabular-nums">
          {spoolType.emptyWeightGrams} g
        </span>
        {isAdmin && (
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive h-7 w-7"
            onClick={handleDelete}
            disabled={pending || spoolCount > 0}
            title={
              spoolCount > 0
                ? `In use by ${spoolCount} spool(s)`
                : 'Delete spool type'
            }
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete spool type</span>
          </Button>
        )}
      </div>

      {canEdit && (
        <EditSpoolTypeDialog
          spoolType={spoolType}
          isAdmin={isAdmin}
          open={editing}
          onOpenChange={setEditing}
        />
      )}
    </li>
  );
}
