'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';
import { getSpoolWeighings, undoLastWeighing } from '@/app/actions/filaments';
import { computeFilamentLeft, formatWeight } from '@/lib/filament';
import type { SpoolWeighing } from '@/lib/db/schema';
import { toast } from 'sonner';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// Recent weighings of one spool in the edit dialog, with an undo for the
// newest one (the fix for a mistyped weight — it restores the previous value
// instead of adding a correcting weighing, so usage stats stay clean).
export function WeighingHistory({
  spoolId,
  emptyWeightGrams,
  onUndone,
}: {
  spoolId: string;
  emptyWeightGrams: number;
  onUndone: (restoredGrams: number) => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<SpoolWeighing[] | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSpoolWeighings(spoolId)
      .then((r) => !cancelled && setRows(r))
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [spoolId]);

  async function undo() {
    try {
      setUndoing(true);
      const grams = await undoLastWeighing(spoolId);
      setRows(await getSpoolWeighings(spoolId));
      onUndone(grams);
      toast.success(`Weight restored to ${formatWeight(grams)} total`);
      router.refresh();
    } catch {
      toast.error('Could not undo the last weighing');
    } finally {
      setUndoing(false);
    }
  }

  if (rows === null || rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Weighing history</span>
        {rows.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={undoing}
          >
            <Undo2 className="mr-1 h-3.5 w-3.5" />
            Undo last
          </Button>
        )}
      </div>
      <ul className="border-border divide-border max-h-40 divide-y overflow-y-auto rounded-md border text-sm">
        {rows.map((w) => (
          <li key={w.id} className="flex justify-between gap-4 px-3 py-1.5">
            <span className="text-muted-foreground">
              {dateFormat.format(new Date(w.measuredAt))}
            </span>
            <span className="font-mono tabular-nums">
              {formatWeight(computeFilamentLeft(w.grams, emptyWeightGrams))}{' '}
              <span className="text-muted-foreground">({w.grams} g total)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
