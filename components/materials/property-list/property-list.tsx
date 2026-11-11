'use client';

import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import * as React from 'react';

import { Inset } from '@/components/common/inset';
import { KeyValueRow } from '@/components/common/key-value-row';
import { SelectField } from '@/components/common/select-field';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input';
import type { Property } from '@/lib/db/schema';
import type { MaterialPropertyView } from '@/lib/material-properties';
import {
  PROPERTY_VALUE_TYPE_EXAMPLES,
  PROPERTY_VALUE_TYPE_HINTS,
  isPropertyValueType,
  normalizePropertyValue,
  type PropertyValueType,
} from '@/lib/property-value';
import { cn } from '@/lib/utils';

type Definition = Pick<Property, 'id' | 'name' | 'unit' | 'valueType'>;

type Draft = { propertyId: string; value: string; error?: string };

type PropertyListProps = {
  values: MaterialPropertyView[];
  definitions: Definition[];
  /** Admins verify and delete values; anyone signed in adds and edits. */
  isAdmin: boolean;
  /** Saves a value; resolve `true` to close the editor, `false` to keep it open. */
  onSave: (propertyId: string, value: string) => Promise<boolean> | boolean;
  onVerify?: (value: MaterialPropertyView) => void;
  onDelete?: (value: MaterialPropertyView) => void;
  /** Disables the actions while a save/verify/delete runs. */
  pending?: boolean;
  className?: string;
};

function typeOf(definitions: Definition[], propertyId: string) {
  const stored = definitions.find((d) => d.id === propertyId)?.valueType;
  return stored && isPropertyValueType(stored) ? stored : 'text';
}

const isNumeric = (t: PropertyValueType) =>
  t === 'integer' || t === 'number' || t === 'range';

/**
 * The datasheet section of the material page (MaterialDetail board, 03
 * Properties): one key-value row per value, edited in place, with an
 * "Unverified" tag on member edits and an add-property inset under the list.
 * Values are checked against their declared type before `onSave` (the server
 * enforces the same rule), so a typo is explained inline.
 */
function PropertyList({
  values,
  definitions,
  isAdmin,
  onSave,
  onVerify,
  onDelete,
  pending,
  className,
}: PropertyListProps) {
  const [editing, setEditing] = React.useState<Draft | null>(null);
  const [adding, setAdding] = React.useState<Draft | null>(null);
  const formId = React.useId();

  const available = definitions.filter(
    (d) => !values.some((v) => v.propertyId === d.id)
  );

  async function save(draft: Draft, setDraft: (d: Draft | null) => void) {
    const value = draft.value.trim();
    if (!draft.propertyId || !value) return;
    const result = normalizePropertyValue(
      typeOf(definitions, draft.propertyId),
      value
    );
    if (!result.ok) {
      setDraft({ ...draft, error: result.message });
      return;
    }
    if (await onSave(draft.propertyId, value)) setDraft(null);
  }

  return (
    <div data-slot="property-list" className={cn('flex flex-col', className)}>
      {values.length === 0 && !adding && (
        <p className="text-muted-foreground py-2.5 text-sm">
          No datasheet values yet — add the first one.
        </p>
      )}
      {values.map((v) => {
        const valueType = typeOf(definitions, v.propertyId);
        if (editing?.propertyId === v.propertyId) {
          const errorId = `${formId}-${v.propertyId}-error`;
          return (
            <form
              key={v.id}
              aria-label={`Edit ${v.name}`}
              onSubmit={(e) => {
                e.preventDefault();
                void save(editing, setEditing);
              }}
              onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
            >
              <KeyValueRow
                className="bg-accent/6 -mx-2.5 px-2.5"
                label={<span className="font-medium">{v.name}</span>}
                action={
                  <>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      aria-label={`Save ${v.name}`}
                      className="text-accent"
                      disabled={pending}
                    >
                      <CheckIcon />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Cancel"
                      onClick={() => setEditing(null)}
                    >
                      <XIcon />
                    </Button>
                  </>
                }
              >
                <div className="flex flex-col gap-1">
                  <InputGroup variant="ink" className="h-[34px] max-w-[180px]">
                    <InputGroupInput
                      autoFocus
                      numeric={isNumeric(valueType)}
                      aria-label={`${v.name} value`}
                      aria-invalid={editing.error ? true : undefined}
                      aria-describedby={editing.error ? errorId : undefined}
                      title={PROPERTY_VALUE_TYPE_HINTS[valueType]}
                      value={editing.value}
                      onChange={(e) =>
                        setEditing({ ...editing, value: e.target.value })
                      }
                    />
                    {v.unit && <InputGroupAddon>{v.unit}</InputGroupAddon>}
                  </InputGroup>
                  {editing.error && (
                    <p id={errorId} className="text-destructive text-xs">
                      {editing.error}
                    </p>
                  )}
                </div>
              </KeyValueRow>
            </form>
          );
        }
        const addedBy = `Added by ${v.submittedByName ?? 'a member'} — not yet verified`;
        return (
          <KeyValueRow
            key={v.id}
            label={
              <>
                {v.name}
                {!v.verified && (
                  <StatusBadge status="unverified" title={addedBy} />
                )}
              </>
            }
            action={
              <>
                {isAdmin && !v.verified && onVerify && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Verify ${v.name}`}
                    className="text-accent"
                    disabled={pending}
                    onClick={() => onVerify(v)}
                  >
                    <CheckIcon />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${v.name}`}
                  disabled={pending}
                  onClick={() => {
                    setAdding(null);
                    setEditing({ propertyId: v.propertyId, value: v.value });
                  }}
                >
                  <PencilIcon />
                </Button>
                {isAdmin && onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${v.name}`}
                    disabled={pending}
                    onClick={() => onDelete(v)}
                  >
                    <Trash2Icon />
                  </Button>
                )}
              </>
            }
          >
            <span className="font-mono">
              {v.value}
              {v.unit && (
                <span className="text-muted-foreground"> {v.unit}</span>
              )}
            </span>
            {!v.verified && <span className="fine block">{addedBy}</span>}
          </KeyValueRow>
        );
      })}

      {adding ? (
        <Inset className="mt-3.5">
          <form
            aria-label="Add property"
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              void save(adding, setAdding);
            }}
            onKeyDown={(e) => e.key === 'Escape' && setAdding(null)}
          >
            <div className="flex items-center justify-between">
              <span className="kicker text-foreground">+ Add property</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close"
                onClick={() => setAdding(null)}
              >
                <XIcon />
              </Button>
            </div>
            <AddPropertyFields
              definitions={available}
              draft={adding}
              onChange={setAdding}
              pending={pending}
              formId={formId}
              valueType={typeOf(definitions, adding.propertyId)}
            />
          </form>
        </Inset>
      ) : (
        available.length > 0 && (
          <Button
            variant="link"
            className="mt-3 self-start"
            onClick={() => {
              setEditing(null);
              setAdding({ propertyId: available[0].id, value: '' });
            }}
          >
            <PlusIcon />
            Add property
          </Button>
        )
      )}
    </div>
  );
}

function AddPropertyFields({
  definitions,
  draft,
  onChange,
  pending,
  formId,
  valueType,
}: {
  definitions: Definition[];
  draft: Draft;
  onChange: (draft: Draft) => void;
  pending?: boolean;
  formId: string;
  valueType: PropertyValueType;
}) {
  const unit = definitions.find((d) => d.id === draft.propertyId)?.unit;
  const helpId = `${formId}-help`;
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] items-end gap-2.5 max-sm:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${formId}-property`}>Property</Label>
          <SelectField
            id={`${formId}-property`}
            items={definitions.map((d) => ({
              value: d.id,
              label: d.unit ? `${d.name} (${d.unit})` : d.name,
            }))}
            value={draft.propertyId}
            onValueChange={(propertyId) =>
              onChange({ propertyId, value: draft.value })
            }
            triggerClassName="w-full"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${formId}-value`}>Value</Label>
          <InputGroup>
            <InputGroupInput
              id={`${formId}-value`}
              numeric={isNumeric(valueType)}
              placeholder={PROPERTY_VALUE_TYPE_EXAMPLES[valueType]}
              aria-invalid={draft.error ? true : undefined}
              aria-describedby={helpId}
              value={draft.value}
              onChange={(e) =>
                onChange({
                  propertyId: draft.propertyId,
                  value: e.target.value,
                })
              }
            />
            {unit && <InputGroupAddon>{unit}</InputGroupAddon>}
          </InputGroup>
        </div>
        <Button type="submit" disabled={pending || !draft.value.trim()}>
          Add
        </Button>
      </div>
      <p
        id={helpId}
        className={cn(
          'text-xs leading-snug',
          draft.error ? 'text-destructive' : 'text-muted-foreground'
        )}
      >
        {draft.error ?? PROPERTY_VALUE_TYPE_HINTS[valueType]}
      </p>
    </>
  );
}

export { PropertyList };
