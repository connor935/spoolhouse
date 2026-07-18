'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EditMaterialDialog } from '@/components/edit-material-dialog';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import {
  approveMaterial,
  deleteMaterial,
  rejectMaterial,
  type MaterialWithUsage,
} from '@/app/actions/materials';
import type { Material } from '@/lib/db/schema';
import { toast } from 'sonner';

export function MaterialCatalogRow({
  material,
  currentUserId,
  isAdmin = false,
}: {
  material: Material | MaterialWithUsage;
  currentUserId: string;
  // Admin rows get edit-any + approve/reject (pending) + delete.
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const ownEditable =
    material.status !== 'approved' && material.submittedById === currentUserId;
  const canEdit = isAdmin || ownEditable;
  const spoolCount = 'spoolCount' in material ? material.spoolCount : 0;

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
    if (!window.confirm(`Delete "${material.manufacturer} — ${material.name}"?`))
      return;
    await run(() => deleteMaterial(material.id), 'Material deleted');
  }

  return (
    <li className="flex items-center justify-between gap-3 px-6 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="border-border h-5 w-5 shrink-0 rounded-full border shadow-inner"
          style={{ backgroundColor: material.color ?? '#94a3b8' }}
          aria-hidden
        />
        <span className="truncate">{material.name}</span>
        {material.status === 'pending' && (
          <Badge variant="outline" className="text-muted-foreground shrink-0">
            Pending review
          </Badge>
        )}
        {material.status === 'rejected' &&
          (isAdmin || material.submittedById === currentUserId) && (
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
        {isAdmin && material.status === 'pending' && (
          <>
            <Button
              size="sm"
              className="h-7"
              onClick={() =>
                run(() => approveMaterial(material.id), 'Material approved')
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
                run(() => rejectMaterial(material.id), 'Material rejected')
              }
              disabled={pending}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Reject
            </Button>
          </>
        )}
        <Badge variant="secondary" className="font-mono text-xs">
          {material.filamentType}
        </Badge>
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
                : 'Delete material'
            }
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete material</span>
          </Button>
        )}
      </div>

      {canEdit && (
        <EditMaterialDialog
          material={material}
          isAdmin={isAdmin}
          open={editing}
          onOpenChange={setEditing}
        />
      )}
    </li>
  );
}
