'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { updateMaterial } from '@/app/actions/materials';
import { MaterialEntryForm } from '@/components/catalog/material-entry-form';
import { StatusBadge } from '@/components/common/status-badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Material } from '@/lib/db/schema';

// Edit dialog for a catalog material (RequestForms board, right): admins edit
// any entry and keep its status; a submitter editing their own rejected entry
// resubmits it. updateMaterial enforces both rules server-side.
export function EditMaterialDialog({
  material,
  open,
  onOpenChange,
  isAdmin = false,
}: {
  material: Material;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const resubmits = !isAdmin && material.status === 'rejected';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader
          kicker={
            <span className="flex items-center gap-2">
              {material.manufacturer} / {material.name}
              {material.status !== 'approved' && (
                <StatusBadge
                  status={
                    material.status === 'rejected' ? 'rejected' : 'pending'
                  }
                />
              )}
            </span>
          }
        >
          <DialogTitle className="text-[30px]">Edit material</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <MaterialEntryForm
            mode="edit"
            autoApprove={isAdmin}
            isAdmin={isAdmin}
            status={material.status}
            defaultValues={material}
            pending={saving}
            onCancel={() => onOpenChange(false)}
            onSubmit={async (values) => {
              setSaving(true);
              try {
                await updateMaterial(material.id, values);
                toast.success(
                  resubmits ? 'Resubmitted for review' : 'Material updated'
                );
                onOpenChange(false);
                router.refresh();
              } catch {
                toast.error('Could not update the material');
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
