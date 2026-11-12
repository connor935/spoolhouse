'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  importManufacturerFromUpstream,
  type UpstreamManufacturer,
} from '@/app/actions/spoolmandb';
import type { ImportRunState } from '@/components/admin/import-progress';
import { ALL_TYPES } from '@/lib/catalog-filter-items';
import { ImportView } from './import-view';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Imports run one manufacturer per server action, sequentially: each call is a
// short unit of work, so progress is visible and the queue is resumable without
// any background-job machinery. Imports are insert-only and idempotent, so
// retrying from the failed manufacturer is safe.
function ImportContainer({
  manufacturers,
}: {
  manufacturers: UpstreamManufacturer[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filamentType, setFilamentType] = useState<string>(ALL_TYPES);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [run, setRun] = useState<ImportRunState | null>(null);
  // The type limit a run started with, so Retry resumes the same import even
  // if the filter was changed after the failure.
  const runTypes = useRef<string[] | undefined>(undefined);

  async function runFrom(queue: string[], start: number) {
    let materials = 0;
    let spoolTypes = 0;
    for (let index = start; index < queue.length; index++) {
      setRun({ status: 'running', queue, index });
      try {
        const outcome = await importManufacturerFromUpstream(queue[index], {
          types: runTypes.current,
        });
        materials += outcome.stats.materialsInserted;
        spoolTypes += outcome.stats.spoolTypesInserted;
      } catch (err) {
        // Stop rather than plough through: a rate limit or an unreachable
        // database would fail every remaining manufacturer the same way.
        setRun({
          status: 'failed',
          queue,
          index,
          message: (err as Error).message,
        });
        router.refresh();
        return;
      }
    }
    setRun({ status: 'done', queue });
    setSelected(new Set());
    toast.success(
      `${plural(materials, 'new material')}, ${plural(spoolTypes, 'new spool type')}.`
    );
    router.refresh();
  }

  return (
    <ImportView
      manufacturers={manufacturers}
      query={query}
      onQueryChange={setQuery}
      filamentType={filamentType}
      onFilamentTypeChange={setFilamentType}
      selected={selected}
      onSelectedChange={setSelected}
      run={run}
      onImport={() => {
        runTypes.current =
          filamentType === ALL_TYPES ? undefined : [filamentType];
        runFrom([...selected], 0);
      }}
      onRetry={() =>
        run?.status === 'failed' && runFrom([...run.queue], run.index)
      }
    />
  );
}

export { ImportContainer };
