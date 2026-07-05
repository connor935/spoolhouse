"use client";

import { useMemo } from "react";
import { Package, Boxes, Scale } from "lucide-react";
import { formatWeight, type FilamentView } from "@/lib/filament";

export function FilamentStats({
  inStock,
  empty,
}: {
  inStock: FilamentView[];
  empty: FilamentView[];
}) {
  const totalRemaining = useMemo(
    () => inStock.reduce((sum, f) => sum + f.filamentLeftGrams, 0),
    [inStock],
  );

  const stats = [
    { label: "Spools in stock", value: String(inStock.length), icon: Boxes },
    { label: "Empty spools", value: String(empty.length), icon: Package },
    {
      label: "Total filament left",
      value: formatWeight(totalRemaining),
      icon: Scale,
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-4 rounded-lg border border-border bg-card p-5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-foreground">
            <s.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {s.value}
            </p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
