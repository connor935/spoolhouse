'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  createPropertyDefinition,
  deletePropertyDefinition,
  updatePropertyDefinition,
  type PropertyWithUsage,
} from '@/app/actions/properties';
import { useAsyncAction } from '@/hooks/use-async-action';
import { useConfirm } from '@/hooks/use-confirm';

export function PropertyAdminList({
  properties,
}: {
  properties: PropertyWithUsage[];
}) {
  const [editing, setEditing] = useState<PropertyWithUsage | null>(null);
  const { pending, run } = useAsyncAction();
  const { confirm, dialogProps } = useConfirm();

  // New-property form
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () =>
        createPropertyDefinition({
          key: key.trim(),
          name: name.trim(),
          unit: unit.trim() || null,
          description: description.trim() || null,
        }),
      {
        success: 'Property created',
        onSuccess: () => {
          setKey('');
          setName('');
          setUnit('');
          setDescription('');
        },
      }
    );
  }

  async function handleDelete(p: PropertyWithUsage) {
    const ok = await confirm({
      title: `Delete "${p.name}"?`,
      description: 'Removes this property definition. Not reversible.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await run(() => deletePropertyDefinition(p.id), {
      success: 'Property deleted',
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <section className="border-border bg-card rounded-lg border">
        {properties.length === 0 ? (
          <p className="text-muted-foreground px-6 py-8 text-center text-sm">
            No properties yet — add the first below.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {properties.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 px-6 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    {p.unit && (
                      <span className="text-muted-foreground text-sm">
                        {p.unit}
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px]"
                    >
                      {p.key}
                    </Badge>
                  </div>
                  {p.description && (
                    <p className="text-muted-foreground truncate text-xs">
                      {p.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {p.valueCount} value{p.valueCount === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive h-7 w-7"
                    onClick={() => handleDelete(p)}
                    disabled={pending || p.valueCount > 0}
                    title={
                      p.valueCount > 0
                        ? `In use by ${p.valueCount} material value(s)`
                        : 'Delete property'
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete property</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-border bg-card rounded-lg border p-6">
        <h2 className="font-semibold">New property</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          The key is a permanent machine identifier (lowercase, e.g.
          <code className="bg-muted mx-1 rounded px-1 py-0.5 text-xs">
            tensile_strength
          </code>
          ) and can’t be changed later.
        </p>
        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="prop-name">Name</Label>
              <Input
                id="prop-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tensile strength"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="prop-key">Key</Label>
              <Input
                id="prop-key"
                required
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. tensile_strength"
                className="font-mono"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="prop-unit">Unit (optional)</Label>
              <Input
                id="prop-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. MPa"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="prop-description">Description (optional)</Label>
              <Input
                id="prop-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short explanation"
              />
            </div>
          </div>
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? 'Saving…' : 'Add property'}
          </Button>
        </form>
      </section>

      {editing && (
        <EditPropertyDialog
          property={editing}
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

function EditPropertyDialog({
  property,
  open,
  onOpenChange,
}: {
  property: PropertyWithUsage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(property.name);
  const [unit, setUnit] = useState(property.unit ?? '');
  const [description, setDescription] = useState(property.description ?? '');
  const { pending, run } = useAsyncAction();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await run(
      () =>
        updatePropertyDefinition(property.id, {
          name: name.trim(),
          unit: unit.trim() || null,
          description: description.trim() || null,
        }),
      { success: 'Property updated', onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit property</DialogTitle>
          <DialogDescription>
            The key{' '}
            <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
              {property.key}
            </code>{' '}
            is permanent and can’t be changed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-prop-name">Name</Label>
            <Input
              id="edit-prop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-prop-unit">Unit</Label>
            <Input
              id="edit-prop-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-prop-description">Description</Label>
            <Input
              id="edit-prop-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
