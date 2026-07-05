"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, Boxes, Scale, Disc3 } from "lucide-react";
import { SpoolCard } from "@/components/spool-card";
import { SpoolFormDialog } from "@/components/spool-form-dialog";
import { UserMenu } from "@/components/user-menu";
import { formatWeight, type FilamentView } from "@/lib/filament";
import type { SpoolType } from "@/lib/db/schema";
import Link from "next/link";

type Filter = "in-stock" | "empty" | "all";

export function WarehouseDashboard({
  filaments,
  spoolTypes,
  user,
}: {
  filaments: FilamentView[];
  spoolTypes: SpoolType[];
  user: { name: string; isAdmin: boolean };
}) {
  const [filter, setFilter] = useState<Filter>("in-stock");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FilamentView | null>(null);

  const inStock = useMemo(
    () => filaments.filter((f) => !f.isEmpty),
    [filaments],
  );
  const empty = useMemo(() => filaments.filter((f) => f.isEmpty), [filaments]);

  const totalRemaining = useMemo(
    () => inStock.reduce((sum, f) => sum + f.filamentLeftGrams, 0),
    [inStock],
  );

  const visible =
    filter === "in-stock" ? inStock : filter === "empty" ? empty : filaments;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(f: FilamentView) {
    setEditing(f);
    setFormOpen(true);
  }

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
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight tracking-tight">
                Spoolhouse
              </h1>
              <p className="text-sm text-muted-foreground">
                Filament warehouse management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={openCreate}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add spool
            </Button>
            <Link href="/spool-types" className="w-fit">
              <Button variant="outline" className="bg-transparent">
                <Disc3 className="mr-2 h-4 w-4" />
                Spool catalog
              </Button>
            </Link>
            <UserMenu name={user.name} isAdmin={user.isAdmin} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
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

        <div className="mt-8 flex items-center justify-between gap-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="in-stock">
                In stock ({inStock.length})
              </TabsTrigger>
              <TabsTrigger value="empty">Empty ({empty.length})</TabsTrigger>
              <TabsTrigger value="all">All ({filaments.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {visible.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <Package className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No spools here</p>
              <p className="text-sm text-muted-foreground">
                {filter === "empty"
                  ? "You haven't used up any spools yet."
                  : "Add your first spool to start tracking inventory."}
              </p>
            </div>
            {filter !== "empty" && (
              <Button
                variant="outline"
                onClick={openCreate}
                className="bg-transparent"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add spool
              </Button>
            )}
          </div>
        ) : (
          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((f) => (
              <SpoolCard key={f.id} filament={f} onEdit={openEdit} />
            ))}
          </section>
        )}
      </main>

      <SpoolFormDialog
        key={editing ? `edit-${editing.id}` : "create"}
        open={formOpen}
        onOpenChange={setFormOpen}
        filament={editing}
        spoolTypes={spoolTypes}
      />
    </div>
  );
}
