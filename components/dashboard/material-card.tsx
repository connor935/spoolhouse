'use client';

import { Badge } from '@/components/ui/badge';
import {
  formatWeight,
  type MaterialInventory,
  type SpoolView,
} from '@/lib/filament';
import { SpoolCard } from './spool-card';

export function MaterialCard({
  inventory,
  visibleSpoolIds,
  onEditSpool,
  onOpenMaterialDialog,
  dryingTemp,
}: {
  inventory: MaterialInventory;
  // Tab filtering: only these spools are listed (indices stay material-wide)
  visibleSpoolIds: Set<string>;
  onEditSpool: (s: SpoolView) => void;
  onOpenMaterialDialog: (material: MaterialInventory) => void;
  dryingTemp?: string | null;
}) {
  const { material, spools, totalLeftGrams } = inventory;
  const swatch = material?.color || '#000000';

  return (
    <div className="border-border bg-card hover:border-accent/40 flex flex-col rounded-lg border transition-colors">
      {/* Only the header opens the material dialog — spool rows below stay
          independently interactive (their edit buttons must not bubble here). */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenMaterialDialog(inventory)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenMaterialDialog(inventory);
          }
        }}
        className="hover:bg-secondary/40 focus-visible:ring-ring flex cursor-pointer items-start justify-between gap-3 rounded-t-lg p-5 pb-3 outline-none focus-visible:ring-2"
      >
        <div className="flex flex-1 items-start gap-3">
          <span
            className="border-border mt-0.5 h-9 w-9 shrink-0 rounded-full border shadow-inner"
            style={{ backgroundColor: swatch }}
            aria-hidden
          />
          <div className="w-full min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-card-foreground line-clamp-2 leading-tight font-medium">
                {material.name}
              </h3>
              <div className="flex min-w-0 shrink-0 items-center gap-2">
                {material.status === 'pending' && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Pending review
                  </Badge>
                )}
                <Badge variant="secondary" className="font-mono text-xs">
                  {material.filamentType}
                </Badge>
              </div>
            </div>
            <div className="text-muted-foreground flex min-w-0 text-sm">
              <p className="truncate">{material.manufacturer}</p>
              <p className="mx-1">·</p>
              <p>
                {spools.length} spool{spools.length === 1 ? '' : 's'}
              </p>
              <p className="mx-1">·</p>
              <p>{formatWeight(totalLeftGrams)} left</p>
            </div>
          </div>
        </div>
      </div>

      <ul className="divide-border border-border divide-y border-t">
        {spools.map((s, i) =>
          visibleSpoolIds.has(s.id) ? (
            <SpoolCard
              key={s.id}
              spool={s}
              index={i}
              onEdit={onEditSpool}
              dryingTemp={dryingTemp}
            />
          ) : null
        )}
      </ul>
    </div>
  );
}
