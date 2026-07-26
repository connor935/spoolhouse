'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { SelectField } from '@/components/common/select-field';
import { Check, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  deleteMaterialProperty,
  setMaterialProperty,
  verifyMaterialProperty,
} from '@/app/actions/properties';
import { useAsyncAction } from '@/hooks/use-async-action';
import { useConfirm } from '@/hooks/use-confirm';
import type { MaterialPropertyView } from '@/lib/material-properties';
import type { Property } from '@/lib/db/schema';

// Wiki-style datasheet values on a material: any logged-in user can add/edit,
// non-admin edits show an "unverified" badge; admins verify/delete. All gating
// here is UX only — the server actions re-check auth.
export function MaterialPropertiesSection({
  materialId,
  values,
  definitions,
  isAdmin,
}: {
  materialId: string;
  values: MaterialPropertyView[];
  definitions: Property[];
  isAdmin: boolean;
}) {
  // The property whose value is being edited inline (existing row).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // The add-new form: null when closed, else the selected definition + value.
  const [adding, setAdding] = useState<{ propertyId: string; value: string } | null>(
    null
  );
  const { pending, run } = useAsyncAction();
  const { confirm, dialogProps } = useConfirm();

  const usedPropertyIds = useMemo(
    () => new Set(values.map((v) => v.propertyId)),
    [values]
  );
  const available = useMemo(
    () => definitions.filter((d) => !usedPropertyIds.has(d.id)),
    [definitions, usedPropertyIds]
  );

  function startEdit(v: MaterialPropertyView) {
    setAdding(null);
    setEditingId(v.propertyId);
    setDraft(v.value);
  }

  async function saveEdit(propertyId: string) {
    const value = draft.trim();
    if (!value) return;
    await run(() => setMaterialProperty({ materialId, propertyId, value }), {
      success: 'Property saved',
      onSuccess: () => setEditingId(null),
    });
  }

  function startAdd() {
    setEditingId(null);
    setAdding({ propertyId: available[0]?.id ?? '', value: '' });
  }

  async function saveAdd() {
    if (!adding) return;
    const value = adding.value.trim();
    if (!adding.propertyId || !value) return;
    await run(
      () =>
        setMaterialProperty({
          materialId,
          propertyId: adding.propertyId,
          value,
        }),
      { success: 'Property saved', onSuccess: () => setAdding(null) }
    );
  }

  async function handleVerify(id: string) {
    await run(() => verifyMaterialProperty(id), { success: 'Marked verified' });
  }

  async function handleDelete(v: MaterialPropertyView) {
    const ok = await confirm({
      title: `Delete ${v.name}?`,
      description: 'Removes this datasheet value from the material.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await run(() => deleteMaterialProperty(v.id), { success: 'Property deleted' });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Properties</span>
        {available.length > 0 && !adding && (
          <button
            type="button"
            onClick={startAdd}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add property
          </button>
        )}
      </div>

      {values.length === 0 && !adding ? (
        <p className="text-muted-foreground text-xs">
          No properties yet — add the first one.
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {values.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="text-muted-foreground min-w-0 truncate text-sm">
                {v.name}
              </span>
              {editingId === v.propertyId ? (
                <span className="flex shrink-0 items-center gap-1.5">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="h-8 w-32 text-right font-mono"
                    autoFocus
                  />
                  {v.unit && (
                    <span className="text-muted-foreground text-xs">
                      {v.unit}
                    </span>
                  )}
                  <Button
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => saveEdit(v.propertyId)}
                    disabled={pending}
                  >
                    <Check className="h-4 w-4" />
                    <span className="sr-only">Save</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Cancel</span>
                  </Button>
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-2">
                  {!v.verified && (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground"
                      title={`Added by ${v.submittedByName ?? 'unknown'} — not yet verified`}
                    >
                      unverified
                    </Badge>
                  )}
                  <span className="text-right text-sm font-medium tabular-nums">
                    {v.value}
                    {v.unit ? ` ${v.unit}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(v)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Edit ${v.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {isAdmin && !v.verified && (
                    <button
                      type="button"
                      onClick={() => handleVerify(v.id)}
                      disabled={pending}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Verify ${v.name}`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(v)}
                      disabled={pending}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${v.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="border-border bg-secondary/50 mt-1 flex items-end gap-2 rounded-md border p-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-muted-foreground text-xs">Property</span>
            <SelectField
              items={available.map((d) => ({
                value: d.id,
                label: d.unit ? `${d.name} (${d.unit})` : d.name,
              }))}
              value={adding.propertyId}
              onValueChange={(propertyId) =>
                setAdding((a) => (a ? { ...a, propertyId } : a))
              }
              triggerClassName="h-8 w-full"
              ariaLabel="Property"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-muted-foreground text-xs">Value</span>
            <Input
              value={adding.value}
              onChange={(e) =>
                setAdding((a) => (a ? { ...a, value: e.target.value } : a))
              }
              placeholder="e.g. 45"
              className="h-8"
            />
          </div>
          <Button size="sm" onClick={saveAdd} disabled={pending}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAdding(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
