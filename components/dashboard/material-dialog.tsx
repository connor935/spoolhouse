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
import { MaterialPropertiesSection } from '@/components/materials/material-properties-section';
import {
  DEFAULT_MATERIAL_COLOR,
  formatWeight,
  SpoolView,
  type MaterialInventory,
} from '@/lib/filament';
import type { MaterialPropertyView } from '@/lib/material-properties';
import type { Property } from '@/lib/db/schema';
import { forecastDays, formatDays } from '@/lib/consumption';
import type { MaterialUsage } from '@/lib/usage-stats';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryMaterial: MaterialInventory | null;
  propertyValues: MaterialPropertyView[];
  propertyDefinitions: Property[];
  usage?: MaterialUsage;
  isAdmin: boolean;
  onAddSpool?: (materialId: string) => void;
  onEditSpool: (s: SpoolView) => void;
};

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
  propertyValues,
  propertyDefinitions,
  usage,
  isAdmin,
  onAddSpool,
  onEditSpool,
}: Props) {
  const material = inventoryMaterial?.material;
  if (!inventoryMaterial || !material) return null;

  const { spools, totalLeftGrams } = inventoryMaterial;
  const runway =
    usage && totalLeftGrams > 0
      ? forecastDays(totalLeftGrams, usage.gramsPerDay)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span
              className="border-border mt-0.5 h-10 w-10 shrink-0 rounded-full border shadow-inner"
              style={{
                backgroundColor: material.color ?? DEFAULT_MATERIAL_COLOR,
              }}
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
                  style={{
                    backgroundColor: material.color ?? DEFAULT_MATERIAL_COLOR,
                  }}
                  aria-hidden
                />
                <span className="font-mono">{material.color ?? 'N/A'}</span>
              </span>
            }
          />
        </div>

        <MaterialPropertiesSection
          materialId={material.id}
          values={propertyValues}
          definitions={propertyDefinitions}
          isAdmin={isAdmin}
        />

        <div className="border-border divide-border flex flex-col divide-y">
          <div className="text-md flex items-center justify-between gap-4 py-2 font-semibold">
            <span className="">Your Stock</span>
            <span className="text-right">
              {`${spools.length} spool ${spools.length === 1 ? '' : 's'} ·
              ${formatWeight(totalLeftGrams)} left`}
            </span>
          </div>

          {usage && usage.usedLast30Grams > 0 && (
            <p className="text-muted-foreground py-2 text-sm">
              {formatWeight(usage.usedLast30Grams)} used in the last 30 days
              {runway !== null &&
                ` · lasts about ${formatDays(runway)} at this pace`}
            </p>
          )}

          {spools.length > 0 && (
            <table className="mt-2 w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Spool type</th>
                  <th className="text-right">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {spools.map((spool, i) => (
                  <tr
                    key={spool.id}
                    className="hover:bg-accent/50 cursor-pointer"
                    onClick={() => onEditSpool(spool)}
                  >
                    <td className="text-muted-foreground w-10 shrink-0 font-mono text-xs">
                      #{i + 1}
                    </td>
                    <td className="col-span-4">{spool.spoolTypeLabel}</td>
                    <td className="w-16 shrink-0 font-mono text-sm font-semibold tabular-nums">
                      {formatWeight(spool.filamentLeftGrams)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
