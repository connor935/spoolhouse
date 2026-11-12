'use client';

import { Meter as MeterPrimitive } from '@base-ui/react/meter';

import { cn } from '@/lib/utils';

type MeterProps = Omit<MeterPrimitive.Root.Props, 'value' | 'children'> & {
  /** Percent filled, 0–100 (values outside are clamped). */
  value: number;
  /** `low` / `error` switch the fill to destructive. */
  tone?: 'default' | 'low' | 'error';
};

/**
 * Segmented fill bar (`.meter`): muted track cut into 5px segments by
 * `mask-segments`, accent fill, destructive when low. Exposed as
 * `role="meter"` with aria values; give it an `aria-label`.
 */
function Meter({ className, value, tone = 'default', ...props }: MeterProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <MeterPrimitive.Root
      data-slot="meter"
      data-tone={tone}
      value={Math.round(clamped)}
      // Pinned so SSR and the browser format aria-valuetext identically
      // ("66%" vs de-DE "66 %" was a hydration mismatch).
      locale="en-US"
      className={cn('block w-full', className)}
      {...props}
    >
      <MeterPrimitive.Track className="mask-segments bg-muted relative block h-2.5 w-full">
        <MeterPrimitive.Indicator
          className={cn(
            'absolute inset-y-0 left-0 block transition-[width]',
            tone === 'default' ? 'bg-accent' : 'bg-destructive'
          )}
          style={{ width: `${clamped}%` }}
        />
      </MeterPrimitive.Track>
    </MeterPrimitive.Root>
  );
}

export { Meter };
