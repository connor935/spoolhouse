'use client';

import * as React from 'react';

import { Note } from '@/components/common/alert';
import { StatusBadge } from '@/components/common/status-badge';
import { Swatch } from '@/components/inventory/swatch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FILAMENT_TYPES } from '@/lib/filament';
import { cn } from '@/lib/utils';

export type MaterialEntryValues = {
  manufacturer: string;
  name: string;
  filamentType: string;
  color: string | null;
};

type MaterialEntryFormProps = {
  /** `request` creates an entry; `edit` changes an existing one. */
  mode: 'request' | 'edit';
  /** Admins and trusted contributors publish straight away. */
  autoApprove: boolean;
  /** Edit: the entry's current status and whether the viewer is an admin. */
  status?: string;
  isAdmin?: boolean;
  defaultValues?: Partial<MaterialEntryValues>;
  /** Swatches offered as one-click colours (the viewer's recent materials). */
  recentColors?: readonly string[];
  pending?: boolean;
  onSubmit: (values: MaterialEntryValues) => void;
  onCancel?: () => void;
  className?: string;
};

const HEX = /^#[0-9a-f]{6}$/i;

/** What saving does, as the RequestForms board words it per case. */
function entryNote({
  mode,
  autoApprove,
  status,
  isAdmin,
}: Pick<
  MaterialEntryFormProps,
  'mode' | 'autoApprove' | 'status' | 'isAdmin'
>) {
  if (mode === 'request')
    return autoApprove
      ? 'As an admin, this is added to the global catalog straight away.'
      : 'You can use it immediately; an admin will review it for the global catalog.';
  if (isAdmin) return 'Edits publish immediately and keep the current status.';
  if (status === 'rejected')
    return 'This entry was rejected. Saving your changes resubmits it for review — until then only you can see it.';
  return "Only you can see this until it's approved.";
}

function submitLabel({
  mode,
  autoApprove,
  status,
  isAdmin,
}: Pick<
  MaterialEntryFormProps,
  'mode' | 'autoApprove' | 'status' | 'isAdmin'
>) {
  if (mode === 'request') return autoApprove ? 'Add' : 'Request';
  return !isAdmin && status === 'rejected' ? 'Save & resubmit' : 'Save changes';
}

/**
 * Request / add / edit form for a catalog material (RequestForms board):
 * manufacturer and name, filament type chips, colour (picker, hex and recent
 * swatches), a live preview of the catalog row and a note on what saving does.
 * Presentational: the caller puts it in a sheet or dialog and runs the action.
 */
function MaterialEntryForm({
  mode,
  autoApprove,
  status,
  isAdmin = false,
  defaultValues,
  recentColors = [],
  pending = false,
  onSubmit,
  onCancel,
  className,
}: MaterialEntryFormProps) {
  const id = React.useId();
  const [manufacturer, setManufacturer] = React.useState(
    defaultValues?.manufacturer ?? ''
  );
  const [name, setName] = React.useState(defaultValues?.name ?? '');
  const [filamentType, setFilamentType] = React.useState(
    defaultValues?.filamentType ?? 'PLA'
  );
  const [color, setColor] = React.useState(
    defaultValues?.color?.toUpperCase() ?? ''
  );
  const colorValid = color === '' || HEX.test(color);
  const previewStatus =
    mode === 'request'
      ? autoApprove
        ? 'approved'
        : 'pending'
      : isAdmin || status === 'approved'
        ? (status ?? 'approved')
        : 'pending';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!manufacturer.trim() || !name.trim() || !colorValid) return;
    onSubmit({
      manufacturer: manufacturer.trim(),
      name: name.trim(),
      filamentType,
      color: color === '' ? null : color,
    });
  }

  const flags = { mode, autoApprove, status, isAdmin };

  return (
    <form
      data-slot="material-entry-form"
      onSubmit={submit}
      className={cn('flex flex-col gap-4', className)}
    >
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${id}-mfr`}>Manufacturer</Label>
          <Input
            id={`${id}-mfr`}
            required
            placeholder="e.g. Prusament"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${id}-name`}>Material name</Label>
          <Input
            id={`${id}-name`}
            required
            placeholder="e.g. Galaxy Black"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span id={`${id}-type`} className="text-sm leading-none font-medium">
          Type
        </span>
        <div
          role="radiogroup"
          aria-labelledby={`${id}-type`}
          className="flex flex-wrap gap-1.5"
        >
          {FILAMENT_TYPES.map((type) => {
            const on = type === filamentType;
            return (
              <Badge
                key={type}
                render={<button type="button" />}
                role="radio"
                aria-checked={on}
                variant={on ? 'inverted' : 'default'}
                className="h-[26px] px-2"
                onClick={() => setFilamentType(type)}
              >
                {type}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-hex`}>Color</Label>
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative size-[38px] cursor-pointer">
            <span className="sr-only">Open color picker</span>
            <Swatch
              color={colorValid && color ? color : null}
              className="size-[38px]"
              decorative
            />
            <input
              type="color"
              value={colorValid && color ? color.toLowerCase() : '#94a3b8'}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <Input
            id={`${id}-hex`}
            className="w-[140px] font-mono"
            placeholder="#RRGGBB"
            aria-invalid={colorValid ? undefined : true}
            aria-describedby={colorValid ? undefined : `${id}-hex-error`}
            value={color}
            onChange={(e) => {
              const v = e.target.value.trim().toUpperCase();
              setColor(v && !v.startsWith('#') ? `#${v}` : v);
            }}
          />
          {recentColors.length > 0 && (
            <div
              role="group"
              aria-label="Recent colors"
              className="flex gap-1.5"
            >
              {recentColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Use ${c}`}
                  onClick={() => setColor(c.toUpperCase())}
                  className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2"
                >
                  <Swatch color={c} size="md" decorative />
                </button>
              ))}
            </div>
          )}
        </div>
        {!colorValid && (
          <p id={`${id}-hex-error`} className="text-destructive text-xs">
            Use a hex colour like #9ADBC0, or leave it empty.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="kicker">Live preview</span>
        <div
          aria-hidden
          className="border-ink bg-card relative flex items-center gap-3.5 rounded-[4px] border py-3 pr-3.5 pl-7"
        >
          <span className="border-ink bg-background absolute top-1/2 left-2.5 -mt-1 size-[7px] rounded-full border" />
          <Swatch
            color={colorValid && color ? color : null}
            className="size-8"
            decorative
          />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="display-name truncate text-xl">
                {name.trim() || 'Material name'}
              </span>
              <Badge>{filamentType}</Badge>
              {previewStatus !== 'approved' && (
                <StatusBadge
                  status={previewStatus === 'rejected' ? 'rejected' : 'pending'}
                />
              )}
            </span>
            <span className="kicker">
              {manufacturer.trim() || 'Manufacturer'}
            </span>
          </span>
        </div>
      </div>

      <Note>{entryNote(flags)}</Note>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending || !colorValid}>
          {pending ? 'Saving…' : submitLabel(flags)}
        </Button>
      </div>
    </form>
  );
}

export { MaterialEntryForm, entryNote };
