'use client';

import * as React from 'react';

import { Alert, Note } from '@/components/common/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  PROPERTY_VALUE_TYPE_HINTS,
  PROPERTY_VALUE_TYPES,
  isPropertyValueType,
  type PropertyValueType,
} from '@/lib/property-value';

/** The fields of a property definition the dialog edits. */
export type PropertyDefinition = {
  id: string;
  key: string;
  name: string;
  unit: string | null;
  description: string | null;
  valueType: string;
  /** Material values using it; a type change re-checks all of them. */
  valueCount: number;
};

export type PropertyDialogValues = {
  key: string;
  name: string;
  unit: string | null;
  description: string | null;
  valueType: PropertyValueType;
};

type PropertyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The definition to edit; omit to create a new one. */
  property?: PropertyDefinition | null;
  pending?: boolean;
  /** Refusal from the server, e.g. a type change existing values don't fit. */
  error?: string | null;
  onSubmit: (values: PropertyDialogValues) => void;
};

const TYPE_LABELS: Record<PropertyValueType, string> = {
  number: 'Number',
  integer: 'Integer',
  range: 'Range',
  list: 'List',
  text: 'Text',
};

const optional = (
  <span className="text-muted-foreground ml-1 font-normal">optional</span>
);

/**
 * Create or edit a datasheet property definition (PropertyDialog board). The
 * key is a permanent machine id: typed on create, shown fixed on edit.
 */
function PropertyDialog({
  open,
  onOpenChange,
  property,
  pending,
  error,
  onSubmit,
}: PropertyDialogProps) {
  const editing = Boolean(property);
  const initialType: PropertyValueType = !property
    ? 'number'
    : isPropertyValueType(property.valueType)
      ? property.valueType
      : 'text';
  const typeLabelId = React.useId();
  const [key, setKey] = React.useState(property?.key ?? '');
  const [name, setName] = React.useState(property?.name ?? '');
  const [unit, setUnit] = React.useState(property?.unit ?? '');
  const [description, setDescription] = React.useState(
    property?.description ?? ''
  );
  const [valueType, setValueType] =
    React.useState<PropertyValueType>(initialType);
  // A refusal is about the type it was given for: picking another type
  // hides it again (state adjusted during render when a new error arrives).
  const [shownError, setShownError] = React.useState(error);
  const [refusedType, setRefusedType] = React.useState(valueType);
  if (error !== shownError) {
    setShownError(error);
    setRefusedType(valueType);
  }
  const visibleError = valueType === refusedType ? error : null;

  const typeChanged = editing && valueType !== initialType;
  const count = property?.valueCount ?? 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      key: key.trim(),
      name: name.trim(),
      unit: unit.trim() || null,
      description: description.trim() || null,
      valueType,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader kicker="A3 — Properties">
          <DialogTitle>
            {editing ? 'Edit property' : 'New property'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="contents">
          <DialogBody className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input
                  required
                  placeholder="e.g. Tensile strength"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              {editing ? (
                <Field>
                  <FieldLabel>
                    Key
                    <span className="text-muted-foreground ml-1 font-normal">
                      fixed
                    </span>
                  </FieldLabel>
                  <Input
                    readOnly
                    value={key}
                    className="bg-muted text-muted-foreground font-mono"
                  />
                </Field>
              ) : (
                <Field>
                  <FieldLabel>Key</FieldLabel>
                  <Input
                    required
                    placeholder="e.g. tensile_strength"
                    className="font-mono"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                  />
                  <FieldDescription>
                    Permanent machine id, lowercase — can&apos;t be changed
                    later.
                  </FieldDescription>
                </Field>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Unit{optional}</FieldLabel>
                <Input
                  placeholder="e.g. MPa"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Description{optional}</FieldLabel>
                <Input
                  placeholder="Short explanation"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </div>
            <div className="flex flex-col gap-1.5">
              <span id={typeLabelId} className="text-[13px] font-medium">
                Value type
              </span>
              <ToggleGroup
                aria-labelledby={typeLabelId}
                value={[valueType]}
                onValueChange={(next) =>
                  next[0] && setValueType(next[0] as PropertyValueType)
                }
                className="flex-wrap"
              >
                {PROPERTY_VALUE_TYPES.map((t) => (
                  <ToggleGroupItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="text-muted-foreground text-xs">
                {PROPERTY_VALUE_TYPE_HINTS[valueType]}
              </p>
            </div>
            {visibleError ? (
              <Alert>{visibleError}</Alert>
            ) : (
              typeChanged && (
                <Note>
                  Changing the type re-checks all{' '}
                  {count.toLocaleString('en-US')} existing value
                  {count === 1 ? '' : 's'}; the change is refused if any no
                  longer fit.
                </Note>
              )
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : editing ? 'Save property' : 'Add property'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { PropertyDialog };
