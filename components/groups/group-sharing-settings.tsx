'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/common/select-field';
import { updateShareSettings } from '@/app/actions/groups';
import type { Material } from '@/lib/db/schema';
import { useAsyncAction } from '@/hooks/use-async-action';

type ShareMode = 'all' | 'whitelist' | 'blacklist';

const SHARE_MODE_ITEMS: { value: ShareMode; label: string }[] = [
  { value: 'all', label: 'Share all materials' },
  { value: 'whitelist', label: 'Share only selected materials' },
  { value: 'blacklist', label: 'Share all except selected materials' },
];

// Sharing is material-level: an override applies to all of the member's
// spools of that material (including future ones).
export function GroupSharingSettings({
  groupId,
  initialShareMode,
  initialOverrideIds,
  ownMaterials,
}: {
  groupId: string;
  initialShareMode: ShareMode;
  initialOverrideIds: string[];
  ownMaterials: Material[];
}) {
  const [shareMode, setShareMode] = useState<ShareMode>(initialShareMode);
  const [overrideIds, setOverrideIds] = useState<Set<string>>(
    new Set(initialOverrideIds)
  );
  const { pending: saving, run } = useAsyncAction();

  function toggle(id: string) {
    setOverrideIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    await run(() => updateShareSettings(groupId, shareMode, [...overrideIds]), {
      success: 'Sharing settings saved',
      error: 'Could not save sharing settings',
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="share-mode">Share mode</Label>
        <SelectField
          id="share-mode"
          items={SHARE_MODE_ITEMS}
          value={shareMode}
          onValueChange={setShareMode}
          triggerClassName="w-full"
        />
      </div>

      {shareMode !== 'all' && (
        <div className="flex flex-col gap-2">
          <Label>
            {shareMode === 'whitelist'
              ? 'Materials to share'
              : 'Materials to exclude'}
          </Label>
          {ownMaterials.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You don&apos;t have any spools yet.
            </p>
          ) : (
            <ul className="border-border bg-card flex flex-col gap-1.5 rounded-lg border p-3">
              {ownMaterials.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id={`override-${m.id}`}
                    checked={overrideIds.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="border-input h-4 w-4 rounded"
                  />
                  <label
                    htmlFor={`override-${m.id}`}
                    className="cursor-pointer"
                  >
                    {m.name}{' '}
                    <span className="text-muted-foreground">
                      — {m.manufacturer}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="self-start">
        {saving ? 'Saving…' : 'Save sharing settings'}
      </Button>
    </div>
  );
}
