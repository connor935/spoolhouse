'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchInput } from '@/components/common/search-input';
import { SelectField } from '@/components/common/select-field';
import {
  importManufacturerFromUpstream,
  type UpstreamManufacturer,
} from '@/app/actions/spoolmandb';
import { ALL_TYPES, TYPE_ITEMS } from '@/lib/catalog-filter-items';
import { matchesTokens, searchTokens } from '@/lib/search';
import { cn } from '@/lib/utils';

type Progress = { done: number; total: number; current: string };

// Imports run one manufacturer per server action, sequentially: each call is a
// short unit of work, so progress is visible and the queue is resumable without
// any background-job machinery. Imports are insert-only and idempotent, so
// re-running a selection after a failure is safe.
export function ImportManufacturers({
  manufacturers,
}: {
  manufacturers: UpstreamManufacturer[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filamentType, setFilamentType] = useState<string>(ALL_TYPES);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Progress | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const visible = useMemo(() => {
    const tokens = searchTokens(query.trim());
    return manufacturers.filter((m) =>
      matchesTokens(tokens, m.slug, m.manufacturerName)
    );
  }, [manufacturers, query]);

  const running = progress !== null;

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function runImport() {
    const slugs = [...selected];
    if (slugs.length === 0) return;
    setFailure(null);
    let materials = 0;
    let spoolTypes = 0;

    for (const [index, slug] of slugs.entries()) {
      setProgress({ done: index, total: slugs.length, current: slug });
      try {
        const outcome = await importManufacturerFromUpstream(slug, {
          types: filamentType === ALL_TYPES ? undefined : [filamentType],
        });
        materials += outcome.stats.materialsInserted;
        spoolTypes += outcome.stats.spoolTypesInserted;
      } catch (err) {
        // Stop rather than plough through: a rate limit or an unreachable
        // database would fail every remaining manufacturer the same way.
        setProgress(null);
        setFailure(
          `${slug}: ${(err as Error).message} — ${index} of ${slugs.length} imported, nothing after ${slug} was attempted.`
        );
        router.refresh();
        return;
      }
    }

    setProgress(null);
    setSelected(new Set());
    toast.success(
      `Imported ${slugs.length} manufacturer${slugs.length === 1 ? '' : 's'}: ` +
        `${materials} new material${materials === 1 ? '' : 's'}, ${spoolTypes} new spool type${spoolTypes === 1 ? '' : 's'}.`
    );
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="border-border bg-card flex flex-wrap items-center gap-2 rounded-lg border px-3 py-3 sm:gap-3 sm:px-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search manufacturer…"
          ariaLabel="Search upstream manufacturers"
        />
        <div className="flex items-center gap-2">
          <Label htmlFor="importType" className="text-muted-foreground text-xs">
            Types
          </Label>
          <SelectField
            id="importType"
            items={TYPE_ITEMS}
            value={filamentType}
            onValueChange={setFilamentType}
            triggerClassName="h-9 w-36"
            ariaLabel="Limit the import to one filament type"
          />
        </div>
        <Button
          size="sm"
          className="h-9"
          disabled={selected.size === 0 || running}
          onClick={runImport}
        >
          {running
            ? `Importing ${progress.done + 1} of ${progress.total} — ${progress.current}…`
            : `Import ${selected.size || ''} selected`.replace('  ', ' ')}
        </Button>
        <span className="text-muted-foreground ml-auto text-xs whitespace-nowrap">
          {visible.length} of {manufacturers.length}
        </span>
      </div>

      {failure && (
        <p className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          Import stopped — {failure}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="border-border bg-card/50 text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
          No manufacturers match your search.
        </div>
      ) : (
        <ul className="border-border divide-border bg-card divide-y rounded-lg border">
          {visible.map((m) => (
            <li key={m.slug}>
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm',
                  running && 'cursor-default opacity-60'
                )}
              >
                <input
                  type="checkbox"
                  className="accent-primary h-4 w-4 shrink-0"
                  checked={selected.has(m.slug)}
                  disabled={running}
                  onChange={() => toggle(m.slug)}
                />
                <span className="min-w-0 flex-1 truncate">
                  {m.manufacturerName ?? m.slug}
                  {m.manufacturerName && (
                    <span className="text-muted-foreground"> · {m.slug}</span>
                  )}
                </span>
                {m.lastError ? (
                  <span className="text-destructive shrink-0 text-xs">
                    last run failed
                  </span>
                ) : m.importedCount > 0 ? (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {m.importedCount} material
                    {m.importedCount === 1 ? '' : 's'}
                    {m.lastImportedAt &&
                      ` · ${m.lastImportedAt.toLocaleDateString()}`}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60 shrink-0 text-xs">
                    not imported
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
