'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  createPropertyDefinition,
  deletePropertyDefinition,
  updatePropertyDefinition,
} from '@/app/actions/properties';
import {
  PropertyDialog,
  type PropertyDefinition,
  type PropertyDialogValues,
} from '@/components/admin/property-dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useKeyedAsyncAction } from '@/hooks/use-async-action';
import { useConfirm } from '@/hooks/use-confirm';
import { PropertiesView } from './properties-view';

type DialogState = {
  /** null: creating a new definition. */
  property: PropertyDefinition | null;
  error: string | null;
};

/** Wires /admin/properties to the definition actions and the PropertyDialog. */
function PropertiesContainer({
  properties,
}: {
  properties: PropertyDefinition[];
}) {
  const router = useRouter();
  const { confirm, dialogProps } = useConfirm();
  const { pendingKey, run } = useKeyedAsyncAction<string>();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [saving, setSaving] = useState(false);

  async function save({ key, ...values }: PropertyDialogValues) {
    if (!dialog) return;
    setSaving(true);
    try {
      if (dialog.property) {
        const result = await updatePropertyDefinition(
          dialog.property.id,
          values
        );
        if (!result.ok) {
          setDialog({ ...dialog, error: result.message });
          return;
        }
        toast.success('Property updated');
      } else {
        await createPropertyDefinition({ key, ...values });
        toast.success('Property created');
      }
      setDialog(null);
      router.refresh();
    } catch {
      // Thrown errors are masked in production builds: name the likely cause.
      toast.error(
        dialog.property
          ? 'Could not save the property'
          : 'Could not create the property — is the key already taken, or not lowercase?'
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: PropertyDefinition) {
    const ok = await confirm({
      title: `Delete "${p.name}"?`,
      description: 'Removes this property definition. Not reversible.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await run(p.id, () => deletePropertyDefinition(p.id), {
      success: 'Property deleted',
      error: 'Could not delete — is it in use by a material by now?',
    });
  }

  return (
    <>
      <PropertiesView
        properties={properties}
        deletingId={pendingKey}
        onCreate={() => setDialog({ property: null, error: null })}
        onEdit={(property) => setDialog({ property, error: null })}
        onDelete={remove}
      />
      {dialog && (
        <PropertyDialog
          // A fresh form per opened definition.
          key={dialog.property?.id ?? 'new'}
          open
          onOpenChange={(open) => !open && setDialog(null)}
          property={dialog.property}
          pending={saving}
          error={dialog.error}
          onSubmit={save}
        />
      )}
      <ConfirmDialog {...dialogProps} />
    </>
  );
}

export { PropertiesContainer };
