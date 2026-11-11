'use client';

import { useId } from 'react';

import { SectionHeader } from '@/components/common/section-header';
import { Button } from '@/components/ui/button';
import { computeFilamentLeft, formatWeight } from '@/lib/filament';
import { cn } from '@/lib/utils';

export type WeighingRow = { id: string; grams: number; measuredAt: Date };

type WeighingHistoryListProps = {
  /** Newest first; null while loading. */
  weighings: WeighingRow[] | null;
  emptyWeightGrams: number;
  /**
   * Removes the newest weighing and restores the previous weight — the fix
   * for a mistyped value, which keeps the usage stats clean.
   */
  onUndo?: () => void;
  undoing?: boolean;
  /** Defaults to the viewer's zone; the history is only fetched client-side. */
  timeZone?: string;
  className?: string;
};

function formatWhen(date: Date, timeZone?: string): string {
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${day} · ${time}`;
}

/** "E Weighing history" in the edit dialog, with Undo last. */
function WeighingHistoryList({
  weighings,
  emptyWeightGrams,
  onUndo,
  undoing,
  timeZone,
  className,
}: WeighingHistoryListProps) {
  const titleId = useId();
  const canUndo = onUndo && weighings !== null && weighings.length > 1;
  return (
    <section
      data-slot="weighing-history-list"
      aria-labelledby={titleId}
      className={cn('flex flex-col gap-2.5', className)}
    >
      <SectionHeader
        id={titleId}
        index="E"
        title="Weighing history"
        className="mb-0 [&_h2]:text-sm"
        aside={
          canUndo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={undoing}
              onClick={onUndo}
            >
              Undo last
            </Button>
          )
        }
      />
      {weighings === null ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <ul aria-label="Weighing history" className="max-h-44 overflow-y-auto">
          {weighings.map((w, i) => (
            <li
              key={w.id}
              className="border-border flex items-baseline gap-3 border-t py-2 first:border-t-0"
            >
              <span
                className={cn('kicker flex-1', i === 0 && 'text-foreground')}
              >
                {formatWhen(w.measuredAt, timeZone)}
              </span>
              <span
                className={cn('font-mono text-sm', i === 0 && 'font-semibold')}
              >
                {formatWeight(computeFilamentLeft(w.grams, emptyWeightGrams))}
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                ({formatWeight(w.grams)} total)
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export { WeighingHistoryList };
