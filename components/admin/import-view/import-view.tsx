'use client';

import * as React from 'react';

import {
  ImportManufacturerRow,
  type ImportManufacturer,
} from '@/components/admin/import-manufacturer-row';
import {
  ImportProgress,
  type ImportRunState,
} from '@/components/admin/import-progress';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { SearchInput } from '@/components/common/search-input';
import { SelectField } from '@/components/common/select-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TYPE_ITEMS } from '@/lib/catalog-filter-items';
import { matchesTokens, searchTokens } from '@/lib/search';

type ImportViewProps = {
  manufacturers: ImportManufacturer[];
  query: string;
  onQueryChange: (query: string) => void;
  /** A filament type, or ALL_TYPES (lib/catalog-filter-items.ts). */
  filamentType: string;
  onFilamentTypeChange: (type: string) => void;
  selected: ReadonlySet<string>;
  onSelectedChange: (selected: Set<string>) => void;
  /** The current or last run; null before the first one. */
  run: ImportRunState | null;
  onImport: () => void;
  onRetry: () => void;
};

/**
 * `/admin/import` (AdminImport board): pick SpoolmanDB manufacturers and
 * import them one after another, with progress, a stop-on-error alert with
 * Retry, and a success note.
 */
function ImportView({
  manufacturers,
  query,
  onQueryChange,
  filamentType,
  onFilamentTypeChange,
  selected,
  onSelectedChange,
  run,
  onImport,
  onRetry,
}: ImportViewProps) {
  const running = run?.status === 'running';
  const visible = React.useMemo(() => {
    const tokens = searchTokens(query.trim());
    return manufacturers.filter((m) =>
      matchesTokens(tokens, m.slug, m.manufacturerName)
    );
  }, [manufacturers, query]);

  const visibleSelected = visible.filter((m) => selected.has(m.slug)).length;
  const allVisible = visible.length > 0 && visibleSelected === visible.length;

  function toggle(slug: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(slug);
    else next.delete(slug);
    onSelectedChange(next);
  }

  function toggleVisible(checked: boolean) {
    const next = new Set(selected);
    for (const m of visible) {
      if (checked) next.add(m.slug);
      else next.delete(m.slug);
    }
    onSelectedChange(next);
  }

  return (
    <div data-slot="import-view" className="flex flex-col gap-6">
      <PageHeader
        index="A4"
        breadcrumb={[{ label: 'Admin' }, { label: 'Import catalog' }]}
        meta="Source · SpoolmanDB"
        title="Import catalog"
        description={
          <>
            Seed the global catalogs from{' '}
            <a
              href="https://github.com/Icezaza2543/SpoolmanDB-Community"
              className="hover:text-foreground underline"
              target="_blank"
              rel="noreferrer"
            >
              SpoolmanDB-Community
            </a>
            , one manufacturer after another. Importing is insert-only: existing
            entries are never overwritten, so re-running is safe and only adds
            what is new.
          </>
        }
      />

      {run && (
        <ImportProgress
          state={run}
          onRetry={run.status === 'failed' ? onRetry : undefined}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={onQueryChange}
          placeholder="Search manufacturer…"
          ariaLabel="Search upstream manufacturers"
          className="min-w-48 flex-1"
        />
        <SelectField
          items={TYPE_ITEMS}
          value={filamentType}
          onValueChange={onFilamentTypeChange}
          ariaLabel="Limit the import to one filament type"
          triggerClassName="w-40"
        />
        <Button
          variant="accent"
          disabled={selected.size === 0 || running}
          onClick={onImport}
        >
          {selected.size > 0 ? `Import ${selected.size} selected` : 'Import'}
        </Button>
        <span className="kicker ml-auto whitespace-nowrap">
          {visible.length} of {manufacturers.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No manufacturers match"
          description="Try another name or slug."
        />
      ) : (
        <div>
          <label className="kicker flex cursor-pointer items-center gap-3 pb-2">
            <Checkbox
              checked={allVisible}
              indeterminate={visibleSelected > 0 && !allVisible}
              disabled={running}
              onCheckedChange={(checked) => toggleVisible(checked)}
            />
            <span className="flex-1">Select all visible</span>
            <span>Status</span>
          </label>
          {visible.map((m) => (
            <ImportManufacturerRow
              key={m.slug}
              manufacturer={m}
              checked={selected.has(m.slug)}
              disabled={running}
              onCheckedChange={(checked) => toggle(m.slug, checked)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { ImportView };
