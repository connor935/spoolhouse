'use client';

import { ResultBox } from '@/components/common/result-box';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input';
import { computeFilamentLeft, formatWeight } from '@/lib/filament';
import { cn } from '@/lib/utils';

import { Meter } from '../meter';
import { WeightDisplay } from '../weight-display';

type SpoolWeightFieldsProps = {
  /** Raw input values; the container parses them on submit. */
  fullGrams: string;
  measuredGrams: string;
  onFullGramsChange: (value: string) => void;
  onMeasuredGramsChange: (value: string) => void;
  /** The picked spool type's empty weight; null until one is picked. */
  emptyWeightGrams: number | null;
  /** Measured total still follows "full + empty spool" (add, untouched). */
  prefilled?: boolean;
  /** Edit: no "new spool" hint under the full weight. */
  editing?: boolean;
  className?: string;
};

function wholeGrams(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Full filament + measured total weight and the "Calculated filament left"
 * result (SpoolAdd / SpoolEdit boards): total − the spool type's empty weight.
 */
function SpoolWeightFields({
  fullGrams,
  measuredGrams,
  onFullGramsChange,
  onMeasuredGramsChange,
  emptyWeightGrams,
  prefilled,
  editing,
  className,
}: SpoolWeightFieldsProps) {
  const full = wholeGrams(fullGrams);
  const measured = wholeGrams(measuredGrams);
  const left =
    emptyWeightGrams !== null && measured !== null
      ? computeFilamentLeft(measured, emptyWeightGrams)
      : null;
  const percent =
    left !== null && full !== null && full > 0
      ? Math.min(100, (left / full) * 100)
      : 0;

  return (
    <div
      data-slot="spool-weight-fields"
      className={cn('flex flex-col gap-4', className)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Full filament weight (g)</FieldLabel>
          <InputGroup>
            <InputGroupInput
              numeric
              inputMode="numeric"
              autoComplete="off"
              value={fullGrams}
              onChange={(e) => onFullGramsChange(e.target.value)}
            />
            <InputGroupAddon>g</InputGroupAddon>
          </InputGroup>
          {!editing && (
            <FieldDescription>
              Filament on a new spool, e.g. 1000 g.
            </FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel>Measured total weight (g)</FieldLabel>
          <InputGroup>
            <InputGroupInput
              numeric
              inputMode="numeric"
              autoComplete="off"
              value={measuredGrams}
              onChange={(e) => onMeasuredGramsChange(e.target.value)}
            />
            <InputGroupAddon>g</InputGroupAddon>
          </InputGroup>
          <FieldDescription>
            {prefilled
              ? 'Prefilled for a fresh spool (filament + empty spool) — adjust to your scale value.'
              : 'Put the whole spool on a scale and enter the value.'}
          </FieldDescription>
        </Field>
      </div>

      <ResultBox role="status">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="kicker">Calculated filament left</span>
          <Meter value={percent} aria-label="Calculated filament left" />
          {left !== null && measured !== null && (
            <span className="fine">
              {formatWeight(measured)} total − {formatWeight(emptyWeightGrams!)}{' '}
              empty spool
            </span>
          )}
        </div>
        {left !== null ? (
          <WeightDisplay
            grams={left}
            size="readout"
            data-testid="calculated-left"
          />
        ) : (
          <span className="display-num text-muted-foreground">—</span>
        )}
      </ResultBox>
    </div>
  );
}

export { SpoolWeightFields };
