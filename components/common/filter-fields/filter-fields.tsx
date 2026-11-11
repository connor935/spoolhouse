'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { Property } from '@/lib/db/schema';
import { FILAMENT_TYPES } from '@/lib/filament';
import {
  parseFilterNumber,
  setPropertyBound,
  type FilterValue,
} from '@/lib/filter-value';
import { cn } from '@/lib/utils';

export type FilterProperty = Pick<
  Property,
  'id' | 'name' | 'unit' | 'valueType'
>;

export type FilterFieldsProps = {
  value: FilterValue;
  onChange: (next: FilterValue) => void;
  /** Filament types offered as toggle chips, in this order. */
  filamentTypes?: readonly string[];
  /** Inventory and group stock; the catalog lists materials, which have no weight. */
  showMinLeft?: boolean;
  /** Group stock only. */
  showHideLent?: boolean;
  /** Datasheet properties offered as min/max ranges; `text` ones are skipped. */
  properties?: readonly FilterProperty[];
};

const labelText = 'text-foreground text-[13px] leading-tight font-medium';

// `.dot`: marks a field that currently filters something.
function ActiveDot({
  active,
  keepSpace,
}: {
  active: boolean;
  keepSpace?: boolean;
}) {
  if (!active && !keepSpace) return null;
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        active && 'bg-accent'
      )}
    />
  );
}

/**
 * Numeric input holding its own draft text, so "1." or "1,2" can be typed on
 * the way to 1.25 while the parent only ever sees numbers (or null). A new
 * value from outside (Clear all, a removed chip) replaces the draft.
 */
function NumberInput({
  value,
  onValueChange,
  ...props
}: Omit<
  React.ComponentProps<typeof InputGroupInput>,
  'value' | 'onChange' | 'defaultValue'
> & {
  value: number | null;
  onValueChange: (next: number | null) => void;
}) {
  const text = (n: number | null) => (n === null ? '' : String(n));
  const [draft, setDraft] = React.useState(() => text(value));
  const [synced, setSynced] = React.useState(value);
  if (value !== synced) {
    setSynced(value);
    if (value !== parseFilterNumber(draft)) setDraft(text(value));
  }
  return (
    <InputGroupInput
      numeric
      inputMode="decimal"
      autoComplete="off"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        onValueChange(parseFilterNumber(e.target.value));
      }}
      {...props}
    />
  );
}

/**
 * The field set behind FilterPanel (desktop) and FilterSheet (mobile): type
 * chips, hide-lent switch, min-remaining grams and property ranges. Fully
 * controlled: every edit emits a whole new FilterValue.
 */
function FilterFields({
  value,
  onChange,
  filamentTypes = FILAMENT_TYPES,
  showMinLeft = false,
  showHideLent = false,
  properties = [],
  layout = 'panel',
}: FilterFieldsProps & {
  /** `panel`: columns under the toolbar. `sheet`: stacked, 44px touch targets. */
  layout?: 'panel' | 'sheet';
}) {
  const id = React.useId();
  const sheet = layout === 'sheet';
  const ranged = properties.filter((p) => p.valueType !== 'text');
  const set = (patch: Partial<FilterValue>) => onChange({ ...value, ...patch });

  function toggleType(type: string) {
    const on = value.filamentTypes.includes(type);
    // Rebuilt from the offered list, so the selection keeps a stable order.
    set({
      filamentTypes: filamentTypes.filter((t) =>
        t === type ? !on : value.filamentTypes.includes(t)
      ),
    });
  }

  function boundInput(property: FilterProperty, which: 'min' | 'max') {
    const constraint = value.propertyConstraints.find(
      (c) => c.propertyId === property.id
    );
    const unit = property.unit ? ` (${property.unit})` : '';
    return (
      <InputGroup className={sheet ? 'h-11' : 'h-8'}>
        <NumberInput
          aria-label={`${which === 'min' ? 'Minimum' : 'Maximum'} ${property.name}${unit}`}
          placeholder={which}
          value={constraint?.[which] ?? null}
          onValueChange={(n) =>
            set({
              propertyConstraints: setPropertyBound(
                value.propertyConstraints,
                property.id,
                which,
                n
              ),
            })
          }
        />
      </InputGroup>
    );
  }

  const isActive = (property: FilterProperty) =>
    value.propertyConstraints.some(
      (c) => c.propertyId === property.id && (c.min !== null || c.max !== null)
    );

  const dash = (
    <span aria-hidden className="text-muted-foreground text-center">
      –
    </span>
  );

  const types = (
    <div
      className={cn('flex flex-col gap-1.5', !sheet && 'flex-[1.2_1_220px]')}
    >
      <span
        id={`${id}-types`}
        className={cn(labelText, 'flex items-center gap-1.5')}
      >
        <ActiveDot active={value.filamentTypes.length > 0} />
        Filament type
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-types`}
        className="flex flex-wrap gap-1.5"
      >
        {filamentTypes.map((type) => {
          const on = value.filamentTypes.includes(type);
          return (
            <Badge
              key={type}
              render={<button type="button" />}
              aria-pressed={on}
              variant={on ? 'accent-solid' : 'default'}
              className={sheet ? 'h-8 px-2.5' : 'h-[26px] px-2'}
              onClick={() => toggleType(type)}
            >
              {type}
            </Badge>
          );
        })}
      </div>
      {showHideLent && (
        <Field className="mt-3 flex-row items-center gap-2.5">
          <Switch
            checked={value.hideLent}
            onCheckedChange={(checked) => set({ hideLent: checked })}
          />
          <FieldLabel>Hide lent spools</FieldLabel>
        </Field>
      )}
    </div>
  );

  const minLeft = showMinLeft && (
    <Field className={cn(!sheet && 'flex-[0.8_1_160px]')}>
      <FieldLabel className="flex items-center gap-1.5">
        <ActiveDot active={value.minLeftGrams !== null} />
        Min. remaining (g)
      </FieldLabel>
      <InputGroup className={cn(sheet && 'h-11')}>
        <NumberInput
          inputMode="numeric"
          placeholder="e.g. 300"
          value={value.minLeftGrams}
          onValueChange={(n) =>
            set({
              minLeftGrams: n === null ? null : Math.max(0, Math.round(n)),
            })
          }
        />
        <InputGroupAddon>g</InputGroupAddon>
      </InputGroup>
    </Field>
  );

  const propertyFields =
    ranged.length === 0 ? null : sheet ? (
      ranged.map((property) => (
        <div
          key={property.id}
          role="group"
          aria-labelledby={`${id}-${property.id}`}
          className="flex flex-col gap-1.5"
        >
          <span className="flex items-center justify-between gap-2">
            <span
              id={`${id}-${property.id}`}
              className={cn(labelText, 'flex items-center gap-1.5')}
            >
              <ActiveDot active={isActive(property)} />
              {property.name}
            </span>
            {property.unit && <span className="kicker">{property.unit}</span>}
          </span>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {boundInput(property, 'min')}
            {dash}
            {boundInput(property, 'max')}
          </div>
        </div>
      ))
    ) : (
      <div className="flex min-w-0 flex-[2_1_360px] flex-col gap-1.5">
        <span id={`${id}-props`} className={labelText}>
          Properties
        </span>
        <div role="group" aria-labelledby={`${id}-props`}>
          {ranged.map((property) => (
            <div
              key={property.id}
              className="grid grid-cols-[minmax(0,150px)_1fr_20px_1fr_50px] items-center gap-2 py-1.5"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-sm">
                <ActiveDot active={isActive(property)} keepSpace />
                <span className="truncate">{property.name}</span>
              </span>
              {boundInput(property, 'min')}
              {dash}
              {boundInput(property, 'max')}
              <span className="kicker">{property.unit}</span>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div
      data-slot="filter-fields"
      data-layout={layout}
      className={sheet ? 'flex flex-col gap-[18px]' : 'flex flex-wrap gap-7'}
    >
      {types}
      {minLeft}
      {propertyFields}
    </div>
  );
}

export { FilterFields };
