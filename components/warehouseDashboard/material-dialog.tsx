'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import {
  formatWeight,
  SpoolView,
  type MaterialInventory,
} from '@/lib/filament';
import { SpoolCard } from './spool-card';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryMaterial: MaterialInventory | null;
  onAddSpool?: (materialId: string) => void;
  onEditSpool: (s: SpoolView) => void;
};

// Format a temperature range: hides when both null, collapses when min == max.
function formatRange(
  min: number | null,
  max: number | null,
  unit: string
): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max)
    return `${min}–${max} ${unit}`;
  return `${min ?? max} ${unit}`;
}

function formatDiameters(diametersMm: string | null): string | null {
  if (!diametersMm) return null;
  const list = diametersMm
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
  return list.length ? `${list.join(', ')} mm` : null;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export function MaterialDialog({
  open,
  onOpenChange,
  inventoryMaterial,
  onAddSpool,
  onEditSpool,
}: Props) {
  const material = inventoryMaterial?.material;
  if (!inventoryMaterial || !material) return null;

  const { spools, totalLeftGrams } = inventoryMaterial;
  const extruder = formatRange(
    material.extruderTempMinC,
    material.extruderTempMaxC,
    '°C'
  );
  const bed = formatRange(material.bedTempMinC, material.bedTempMaxC, '°C');
  const diameters = formatDiameters(material.diametersMm);
  const density =
    material.densityGCm3 !== null ? `${material.densityGCm3} g/cm³` : null;

  const hasReferenceData = Boolean(extruder || bed || diameters || density);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className="border-border mt-0.5 h-10 w-10 shrink-0 rounded-full border shadow-inner"
              style={{ backgroundColor: material.color ?? '#94a3b8' }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2">
                <span className="min-w-0 truncate">{material.name}</span>
                <Badge
                  variant="secondary"
                  className="shrink-0 font-mono text-xs"
                >
                  {material.filamentType}
                </Badge>
                {material.status !== 'approved' && (
                  <Badge
                    variant="outline"
                    className={
                      material.status === 'rejected'
                        ? 'border-destructive/40 text-destructive shrink-0'
                        : 'text-muted-foreground shrink-0'
                    }
                  >
                    {material.status}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>{material.manufacturer}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="divide-border flex flex-col divide-y">
          <DetailRow
            label="Color"
            value={
              <span className="flex items-center justify-end gap-2">
                <span
                  className="border-border h-4 w-4 rounded-full border"
                  style={{ backgroundColor: material.color ?? '#94a3b8' }}
                  aria-hidden
                />
                <span className="font-mono">{material.color ?? 'N/A'}</span>
              </span>
            }
          />
          {diameters && <DetailRow label="Diameter" value={diameters} />}
          {extruder && <DetailRow label="Extruder temp" value={extruder} />}
          {bed && <DetailRow label="Bed temp" value={bed} />}
          {density && <DetailRow label="Density" value={density} />}
        </div>

        <div>
          <DetailRow
            label="Your stock"
            value={`${spools.length} spool${spools.length === 1 ? '' : 's'} · ${formatWeight(totalLeftGrams)} left`}
          />
          {spools.length > 0 && (
            <ul className="divide-border border-border divide-y">
              {spools.map((spool, i) => (
                <li
                  key={spool.id}
                  className="flex items-center justify-between gap-4 px-5 py-2"
                >
                  <span className="text-muted-foreground w-10 shrink-0 font-mono text-xs">
                    #{i + 1}
                  </span>
                  <div
                    className="bg-secondary flex h-2 w-full flex-1 overflow-hidden rounded-full"
                    role="progressbar"
                    aria-valuenow={Math.round(spool.percentLeft)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        spool.isEmpty
                          ? 'bg-muted-foreground/30'
                          : spool.isLow
                            ? 'bg-destructive'
                            : 'bg-accent'
                      }`}
                      style={{ width: `${spool.percentLeft}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 font-mono text-sm font-semibold tabular-nums">
                    {formatWeight(spool.filamentLeftGrams)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!hasReferenceData && (
          <p className="text-muted-foreground text-xs">
            No reference data (diameter, temperatures, density) for this
            material yet.
          </p>
        )}

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {onAddSpool && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onAddSpool(material.id);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add spool
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
