import { Alert, Note } from '@/components/common/alert';
import { ResultBox } from '@/components/common/result-box';
import { Meter } from '@/components/inventory/meter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * State of a sequential import run, one manufacturer per server action (see
 * components/admin/import-manufacturers.tsx). `index` is the slug in flight,
 * or the one that failed; the run stops there, so everything before it was
 * imported and everything after it skipped.
 */
export type ImportRunState =
  | { status: 'running'; queue: readonly string[]; index: number }
  | {
      status: 'failed';
      queue: readonly string[];
      index: number;
      message: string;
    }
  | { status: 'done'; queue: readonly string[] };

type ImportProgressProps = {
  state: ImportRunState;
  /** Offered on failure; re-runs are safe because imports are idempotent. */
  onRetry?: () => void;
  className?: string;
};

const list = (slugs: readonly string[]) => slugs.join(', ');
const wasWere = (slugs: readonly string[]) =>
  slugs.length === 1 ? 'was' : 'were';

function failureSummary(
  imported: readonly string[],
  skipped: readonly string[]
) {
  const head =
    imported.length > 0
      ? `${list(imported)} ${wasWere(imported)} imported`
      : 'Nothing was imported';
  return skipped.length > 0
    ? `${head}; ${list(skipped)} ${wasWere(skipped)} skipped.`
    : `${head}.`;
}

/** Progress line, failure alert with Retry, or success note (AdminImport board). */
function ImportProgress({ state, onRetry, className }: ImportProgressProps) {
  const { queue } = state;

  if (state.status === 'done') {
    return (
      <Note data-slot="import-progress" className={className}>
        Imported {queue.length}{' '}
        {queue.length === 1 ? 'manufacturer' : 'manufacturers'}: {list(queue)}.
      </Note>
    );
  }

  if (state.status === 'failed') {
    const slug = queue[state.index];
    return (
      <Alert
        data-slot="import-progress"
        className={className}
        action={
          onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        <strong>
          Import stopped at <span className="font-mono">{slug}</span>.
        </strong>{' '}
        {state.message}{' '}
        <span className="text-muted-foreground">
          {failureSummary(
            queue.slice(0, state.index),
            queue.slice(state.index + 1)
          )}
        </span>
      </Alert>
    );
  }

  const { index } = state;
  return (
    <ResultBox
      data-slot="import-progress"
      role="status"
      className={cn('flex-col items-stretch gap-2.5', className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">
          Importing {index + 1} of {queue.length} —{' '}
          <span className="font-mono">{queue[index]}</span>…
        </span>
        <span className="kicker">
          {queue.map((s, i) => (i < index ? `${s} ✓` : s)).join(' · ')}
        </span>
      </div>
      <Meter
        aria-label="Import progress"
        value={(index / queue.length) * 100}
      />
    </ResultBox>
  );
}

export { ImportProgress };
