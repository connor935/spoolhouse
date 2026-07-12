'use client';

import { useMemo } from 'react';
import { Package, Boxes, Layers, Scale } from 'lucide-react';
import { formatWeight, type SpoolView } from '@/lib/filament';

export function FilamentStats({
  materialCount,
  inStock,
  empty,
}: {
  materialCount: number;
  inStock: SpoolView[];
  empty: SpoolView[];
}) {
  const totalRemaining = useMemo(
    () => inStock.reduce((sum, s) => sum + s.filamentLeftGrams, 0),
    [inStock]
  );

  const stats = [
    { label: 'Materials', value: String(materialCount), icon: Layers },
    { label: 'Spools in stock', value: String(inStock.length), icon: Boxes },
    { label: 'Empty spools', value: String(empty.length), icon: Package },
    {
      label: 'Total filament left',
      value: formatWeight(totalRemaining),
      icon: Scale,
    },
  ];

  return (
    <section className="hidden grid-cols-1 gap-4 sm:grid-cols-2 lg:grid lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="border-border bg-card flex items-center gap-4 rounded-lg border p-5"
        >
          <div className="bg-secondary text-foreground flex h-11 w-11 items-center justify-center rounded-md">
            <s.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {s.value}
            </p>
            <p className="text-muted-foreground text-sm">{s.label}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
