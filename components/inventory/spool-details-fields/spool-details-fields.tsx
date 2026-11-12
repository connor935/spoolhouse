'use client';

import { SectionHeader } from '@/components/common/section-header';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Raw input values; the container parses them (price → cents) on submit. */
export type SpoolDetailsValue = {
  price: string;
  /** 'YYYY-MM-DD' or ''. */
  purchasedAt: string;
  location: string;
  /** 'YYYY-MM-DD' or ''. */
  lastDried: string;
};

type SpoolDetailsFieldsProps = {
  value: SpoolDetailsValue;
  onChange: (next: SpoolDetailsValue) => void;
  /** The user's existing storage locations, offered as one-click chips. */
  locations?: readonly string[];
  /** Read-only tag id; NFC tags are only written through the REST API. */
  tagUid?: string | null;
  /** "D Details · optional" heading (add); edit shows the fields bare. */
  heading?: boolean;
  className?: string;
};

const MAX_SUGGESTIONS = 6;

/** Price, purchase date, location and last-dried date of a spool. */
function SpoolDetailsFields({
  value,
  onChange,
  locations = [],
  tagUid,
  heading,
  className,
}: SpoolDetailsFieldsProps) {
  const set = (patch: Partial<SpoolDetailsValue>) =>
    onChange({ ...value, ...patch });
  const suggestions = locations
    .filter((l) => l !== value.location.trim())
    .slice(0, MAX_SUGGESTIONS);

  return (
    <div
      data-slot="spool-details-fields"
      className={cn('flex flex-col gap-3', className)}
    >
      {heading && (
        <SectionHeader
          index="D"
          title="Details"
          aside="optional"
          className="mb-0 [&_h2]:text-sm"
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Price paid (€)</FieldLabel>
          <InputGroup>
            <InputGroupInput
              numeric
              inputMode="decimal"
              autoComplete="off"
              placeholder="optional"
              value={value.price}
              onChange={(e) => set({ price: e.target.value })}
            />
            <InputGroupAddon>€</InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel>Purchased</FieldLabel>
          <Input
            type="date"
            className="font-mono"
            value={value.purchasedAt}
            onChange={(e) => set({ purchasedAt: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel>Location</FieldLabel>
          <Input
            placeholder="e.g. Dry box 2"
            maxLength={100}
            autoComplete="off"
            value={value.location}
            onChange={(e) => set({ location: e.target.value })}
          />
          {suggestions.length > 0 && (
            <div
              role="group"
              aria-label="Location suggestions"
              className="flex flex-wrap gap-1.5"
            >
              {suggestions.map((l) => (
                <Badge
                  key={l}
                  variant="inverted"
                  render={
                    <button
                      type="button"
                      onClick={() => set({ location: l })}
                      className="cursor-pointer"
                    />
                  }
                >
                  {l}
                </Badge>
              ))}
            </div>
          )}
        </Field>
        <Field>
          <FieldLabel>Last dried</FieldLabel>
          <Input
            type="date"
            className="font-mono"
            value={value.lastDried}
            onChange={(e) => set({ lastDried: e.target.value })}
          />
        </Field>
      </div>
      {tagUid && (
        <div className="border-border flex items-center justify-between gap-3 rounded-[4px] border px-2.5 py-2">
          <span className="kicker">NFC tag · set via API</span>
          <span className="font-mono text-xs break-all">{tagUid}</span>
        </div>
      )}
    </div>
  );
}

export { SpoolDetailsFields };
