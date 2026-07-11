'use client';

import { Badge } from '@/components/ui/badge';
import {
  formatWeight,
  type MaterialInventory,
  type SpoolView,
} from '@/lib/filament';
import { SpoolCard } from './spool-card';
import { Dialog } from '@base-ui/react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';

export function MaterialCard({
  inventory,
  visibleSpoolIds,
  onEditSpool,
  onAddSpool,
}: {
  inventory: MaterialInventory;
  // Tab filtering: only these spools are listed (indices stay material-wide)
  visibleSpoolIds: Set<number>;
  onEditSpool: (s: SpoolView) => void;
  onAddSpool: (materialId: number) => void;
}) {
  const { material, spools, totalLeftGrams } = inventory;
  const swatch = material?.color || '#000000';

  return (
    <div className="border-border bg-card hover:border-accent/40 flex flex-col rounded-lg border transition-colors">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="flex items-start gap-3">
          <span
            className="border-border mt-0.5 h-9 w-9 shrink-0 rounded-full border shadow-inner"
            style={{ backgroundColor: swatch }}
            aria-hidden
          />
          <div className="min-w-0">
            <h3 className="text-card-foreground truncate leading-tight font-medium">
              {material.name}
            </h3>
            <div className="text-muted-foreground flex gap-2 text-sm">
              <p className="truncate">{material.manufacturer}</p>
              <p>|</p>
              <p>
                {spools.length} spool{spools.length === 1 ? '' : 's'} ·{' '}
                {formatWeight(totalLeftGrams)} left
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {material.filamentType}
          </Badge>
          {material.status === 'pending' && (
            <Badge variant="outline" className="text-muted-foreground">
              Pending review
            </Badge>
          )}
        </div>
      </div>

      <ul className="divide-border border-border divide-y border-t">
        {spools.map((s, i) =>
          visibleSpoolIds.has(s.id) ? (
            <SpoolCard key={s.id} spool={s} index={i} onEdit={onEditSpool} />
          ) : null
        )}
      </ul>
    </div>
  );
}
