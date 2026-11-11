'use client';

import * as React from 'react';

import { SearchInput } from '@/components/common/search-input';
import { Meter } from '@/components/inventory/meter';
import { Swatch } from '@/components/inventory/swatch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupCard } from '@/components/ui/radio-group';
import { matchesTokens, searchTokens } from '@/lib/search';
import { isMaterialShared } from '@/lib/share-mode';
import { cn } from '@/lib/utils';

export type ShareMode = 'all' | 'whitelist' | 'blacklist';

/** One of your materials, with how many of your spools it covers. */
export type ShareableMaterial = {
  id: string;
  name: string;
  manufacturer?: string;
  filamentType: string;
  color?: string | null;
  /** Your non-empty spools of it (empty spools are never shared). */
  spoolCount: number;
};

const MODES: { value: ShareMode; title: string; description: string }[] = [
  {
    value: 'all',
    title: 'Share all materials',
    description: 'Every spool you own is visible to this group.',
  },
  {
    value: 'whitelist',
    title: 'Share only selected materials',
    description: 'Pick the materials members may see and request.',
  },
  {
    value: 'blacklist',
    title: 'Share all except selected materials',
    description: 'Hide a few materials, share the rest.',
  },
];

const LIST_LABEL: Record<ShareMode, string> = {
  all: 'All materials are shared',
  whitelist: 'Materials to share',
  blacklist: 'Materials to hide',
};

/**
 * How many of your spools the group sees under `mode` + `selectedIds`, with
 * the same rule `getSharedFilaments()` applies (`isMaterialShared`).
 */
function shareModePreview(
  mode: ShareMode,
  selectedIds: Iterable<string>,
  materials: ShareableMaterial[]
): { visible: number; total: number } {
  const selected = new Set(selectedIds);
  let visible = 0;
  let total = 0;
  for (const m of materials) {
    total += m.spoolCount;
    if (isMaterialShared(mode, selected, m.id)) visible += m.spoolCount;
  }
  return { visible, total };
}

type ShareModePickerProps = {
  mode: ShareMode;
  onModeChange: (mode: ShareMode) => void;
  /** The override list; its meaning flips with the mode. */
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  materials: ShareableMaterial[];
  onSave?: () => void;
  saving?: boolean;
  className?: string;
};

/**
 * "My sharing" on the group settings page (GroupSettings 01): share-mode
 * radio cards with a live "N of M spools visible" preview next to the
 * material checklist. Controlled; saving is the caller's job.
 */
function ShareModePicker({
  mode,
  onModeChange,
  selectedIds,
  onSelectedIdsChange,
  materials,
  onSave,
  saving,
  className,
}: ShareModePickerProps) {
  const [query, setQuery] = React.useState('');
  const id = React.useId();
  const selected = new Set(selectedIds);
  const { visible, total } = shareModePreview(mode, selected, materials);
  const tokens = searchTokens(query);
  const shown = materials.filter((m) =>
    matchesTokens(tokens, m.name, m.manufacturer, m.filamentType)
  );
  const listDisabled = mode === 'all';

  function toggle(materialId: string, checked: boolean) {
    onSelectedIdsChange(
      checked
        ? [...selectedIds, materialId]
        : selectedIds.filter((s) => s !== materialId)
    );
  }

  return (
    <div
      data-slot="share-mode-picker"
      className={cn('flex flex-wrap gap-6', className)}
    >
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2">
        <RadioGroup
          aria-label="Share mode"
          value={mode}
          onValueChange={(value) => onModeChange(value as ShareMode)}
        >
          {MODES.map((m) => (
            <RadioGroupCard
              key={m.value}
              value={m.value}
              title={m.title}
              description={m.description}
            />
          ))}
        </RadioGroup>
        <div className="mt-2 flex flex-col gap-1.5">
          <Meter
            value={total === 0 ? 0 : (visible / total) * 100}
            aria-label="Spools visible to the group"
            aria-valuetext={`${visible} of ${total} spools`}
          />
          <span className="kicker" aria-live="polite">
            Preview · {visible} of {total} spools visible
          </span>
        </div>
      </div>

      <div className="border-ink bg-card flex min-w-0 flex-[1.2_1_360px] flex-col overflow-hidden rounded-[4px] border">
        <div className="border-border flex flex-col gap-2 border-b px-3 py-2.5">
          <span id={`${id}-list`} className="kicker text-foreground">
            {LIST_LABEL[mode]}
          </span>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search your materials…"
            ariaLabel="Search your materials"
          />
        </div>
        <ul
          aria-labelledby={`${id}-list`}
          className={cn(
            'm-0 list-none px-3 py-1',
            listDisabled && 'opacity-60'
          )}
        >
          {shown.map((m) => (
            <li key={m.id} className="border-border border-t first:border-t-0">
              <label className="flex cursor-pointer items-center gap-3 py-[9px] text-sm has-data-disabled:cursor-not-allowed">
                <Checkbox
                  checked={listDisabled || selected.has(m.id)}
                  disabled={listDisabled}
                  onCheckedChange={(checked) => toggle(m.id, checked)}
                />
                <Swatch color={m.color} decorative />
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                <Badge>{m.filamentType}</Badge>
                <span className="kicker w-6 text-right">
                  {m.spoolCount}
                  <span className="sr-only">
                    {m.spoolCount === 1 ? ' spool' : ' spools'}
                  </span>
                </span>
              </label>
            </li>
          ))}
          {shown.length === 0 && (
            <li className="text-muted-foreground py-3 text-sm">
              {materials.length === 0
                ? "You don't have any spools yet."
                : 'No material matches.'}
            </li>
          )}
        </ul>
        {onSave && (
          <div className="border-border mt-auto flex justify-end border-t px-3 py-2.5">
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save sharing settings'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export { ShareModePicker, shareModePreview };
