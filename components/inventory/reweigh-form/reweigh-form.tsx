'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import {
  computeFilamentLeft,
  EMPTY_THRESHOLD_G,
  formatWeight,
  LOW_THRESHOLD_PCT,
  type SpoolView,
} from '@/lib/filament';
import { cn } from '@/lib/utils';

import { Meter } from '../meter';
import { WeightDisplay } from '../weight-display';

type ReweighPreview = {
  /** Filament left at the new total, clamped ≥ 0. */
  leftGrams: number;
  /** Change in filament left against the spool's current value. */
  deltaGrams: number;
  percentLeft: number;
  isLow: boolean;
};

/**
 * Live preview for a re-weigh: what the spool would hold at the typed total.
 * Same maths as `toSpoolView`, so the preview matches what Save produces.
 */
function reweighPreview(
  spool: Pick<
    SpoolView,
    'emptyWeightGrams' | 'fullFilamentWeightGrams' | 'filamentLeftGrams'
  >,
  measuredTotalGrams: number
): ReweighPreview {
  const leftGrams = computeFilamentLeft(
    measuredTotalGrams,
    spool.emptyWeightGrams
  );
  const percentLeft =
    spool.fullFilamentWeightGrams > 0
      ? Math.min(100, (leftGrams / spool.fullFilamentWeightGrams) * 100)
      : 0;
  return {
    leftGrams,
    deltaGrams: leftGrams - spool.filamentLeftGrams,
    percentLeft,
    isLow: leftGrams <= EMPTY_THRESHOLD_G || percentLeft <= LOW_THRESHOLD_PCT,
  };
}

/** Typed grams → integer (the server rounds the same way), or null if unreadable. */
function parseGrams(input: string): number | null {
  const t = input.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Math.round(Number(t));
}

function formatDelta(grams: number): string {
  if (grams === 0) return 'No change';
  // U+2212 minus, as on the boards.
  return `${grams < 0 ? '−' : '+'}${formatWeight(Math.abs(grams))}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatAgo(date: Date, now: Date): string {
  const days = Math.floor((now.getTime() - date.getTime()) / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

type ReweighFormProps = Omit<React.ComponentProps<'form'>, 'onSubmit'> & {
  spool: SpoolView;
  /** Initial input value; defaults to the spool's current total. */
  defaultMeasuredGrams?: number;
  /** When the current weight was recorded, for the "Last: …" line. */
  lastWeighedAt?: Date | null;
  /** Injectable clock for stories and tests. */
  now?: Date;
  /** The viewer borrows this spool: the drop counts toward the borrow. */
  borrowed?: boolean;
  /** `sheet` = mobile: bigger input, full-width Save. */
  size?: 'popover' | 'sheet';
  pending?: boolean;
  onSave: (measuredTotalWeightGrams: number) => void;
  onEditDetails?: () => void;
};

/**
 * Presentational re-weigh form: measured total in grams, the previous
 * weighing, a live "filament left" preview and Save (Enter submits).
 * ReweighPopover / ReweighSheet wrap it; the container calls the action.
 */
function ReweighForm({
  className,
  spool,
  defaultMeasuredGrams,
  lastWeighedAt,
  now,
  borrowed,
  size = 'popover',
  pending,
  onSave,
  onEditDetails,
  ...props
}: ReweighFormProps) {
  const [value, setValue] = React.useState(
    String(defaultMeasuredGrams ?? spool.measuredTotalWeightGrams)
  );
  const grams = parseGrams(value);
  const preview = grams === null ? null : reweighPreview(spool, grams);
  const sheet = size === 'sheet';

  const last = [
    `Last: ${formatWeight(spool.measuredTotalWeightGrams)} total`,
    lastWeighedAt && formatAgo(lastWeighedAt, now ?? new Date()),
  ]
    .filter(Boolean)
    .join(' · ');

  let deltaText = '';
  if (preview) {
    deltaText =
      borrowed && preview.deltaGrams < 0
        ? `${formatDelta(preview.deltaGrams)} · counts toward this borrow`
        : `${formatDelta(preview.deltaGrams)} since last`;
  }

  return (
    <form
      data-slot="reweigh-form"
      noValidate
      className={cn('flex flex-col gap-3.5', sheet && 'gap-4', className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (grams !== null && !pending) onSave(grams);
      }}
      {...props}
    >
      <Field invalid={grams === null}>
        <FieldLabel>Measured total weight (g)</FieldLabel>
        <InputGroup className={sheet ? 'h-14' : 'h-12'}>
          <InputGroupInput
            numeric
            autoFocus
            inputMode="numeric"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={sheet ? 'text-2xl' : 'text-xl'}
          />
          <InputGroupAddon>g</InputGroupAddon>
        </InputGroup>
        <FieldDescription>{last}</FieldDescription>
        {grams === null && (
          <FieldError>Enter the weight in whole grams.</FieldError>
        )}
      </Field>

      <div
        className={cn(
          'flex items-end justify-between gap-2.5',
          !sheet && 'border-border border-y border-dashed py-2.5'
        )}
      >
        <div className="flex flex-col gap-1">
          <span className="kicker">Filament left</span>
          <output aria-live="polite" className="text-accent font-mono text-xs">
            {deltaText}
          </output>
        </div>
        {preview ? (
          <WeightDisplay
            grams={preview.leftGrams}
            size="readout"
            className={sheet ? undefined : 'text-4xl'}
            data-testid="reweigh-left"
          />
        ) : (
          <span className="display-num text-muted-foreground">—</span>
        )}
      </div>
      <Meter
        value={preview?.percentLeft ?? 0}
        tone={preview?.isLow ? 'low' : 'default'}
        aria-label="Filament left after re-weigh"
      />

      {sheet ? (
        <>
          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="w-full"
            disabled={grams === null || pending}
          >
            Save
          </Button>
          {onEditDetails && (
            <Button
              type="button"
              variant="link"
              className="self-center"
              onClick={onEditDetails}
            >
              Edit all details
            </Button>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between gap-2">
          {onEditDetails ? (
            <Button type="button" variant="link" onClick={onEditDetails}>
              Edit all details
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            variant="accent"
            size="sm"
            disabled={grams === null || pending}
          >
            Save
            <Kbd aria-hidden>↵</Kbd>
          </Button>
        </div>
      )}
    </form>
  );
}

export { ReweighForm, reweighPreview, type ReweighPreview };
