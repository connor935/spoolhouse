'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { updateSpoolType } from '@/app/actions/spool-types';
import { SpoolTypeEntryForm } from '@/components/catalog/spool-type-entry-form';
import { StatusBadge } from '@/components/common/status-badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SpoolType } from '@/lib/db/schema';

// Edit dialog for a spool type; same status rules as EditMaterialDialog,
// enforced by updateSpoolType.
export function EditSpoolTypeDialog({
  spoolType,
  open,
  onOpenChange,
  isAdmin = false,
}: {
  spoolType: SpoolType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const resubmits = !isAdmin && spoolType.status === 'rejected';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader
          kicker={
            <span className="flex items-center gap-2">
              {spoolType.manufacturer} / {spoolType.name}
              {spoolType.status !== 'approved' && (
                <StatusBadge
                  status={
                    spoolType.status === 'rejected' ? 'rejected' : 'pending'
                  }
                />
              )}
            </span>
          }
        >
          <DialogTitle className="text-[30px]">Edit spool type</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <SpoolTypeEntryForm
            mode="edit"
            autoApprove={isAdmin}
            isAdmin={isAdmin}
            status={spoolType.status}
            defaultValues={spoolType}
            pending={saving}
            onCancel={() => onOpenChange(false)}
            onSubmit={async (values) => {
              setSaving(true);
              try {
                await updateSpoolType(spoolType.id, values);
                toast.success(
                  resubmits ? 'Resubmitted for review' : 'Spool type updated'
                );
                onOpenChange(false);
                router.refresh();
              } catch {
                toast.error('Could not update the spool type');
              } finally {
                setSaving(false);
              }
            }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
