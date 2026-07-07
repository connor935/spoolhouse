"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, UsersRound, ArrowLeftRight } from "lucide-react";
import { BorrowsPanel } from "@/components/borrows-panel";
import { GroupStock } from "@/components/group-stock";
import { MaterialCard } from "@/components/material-card";
import { SpoolFormDialog } from "@/components/spool-form-dialog";
import type { MaterialInventory, SpoolView } from "@/lib/filament";
import type { MyLend } from "@/app/actions/lends";
import type { Material, SpoolType } from "@/lib/db/schema";
import type { SharedSpool } from "@/lib/sharing";
import Link from "next/link";
import { AppHeader } from "./app-header";
import { FilamentStats } from "./filament-stats";

type Filter = "in-stock" | "empty" | "all" | "borrows" | `group-${number}`;

type DashboardGroup = { id: number; name: string; stock: SharedSpool[] };

export function WarehouseDashboard({
  inventory,
  usableMaterials,
  spoolTypes,
  groups,
  myLends,
  unreadCount,
  user,
}: {
  inventory: MaterialInventory[];
  usableMaterials: Material[];
  spoolTypes: SpoolType[];
  groups: DashboardGroup[];
  myLends: MyLend[];
  unreadCount: number;
  user: { id: string; name: string; isAdmin: boolean };
}) {
  const [filter, setFilter] = useState<Filter>("in-stock");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpool, setEditingSpool] = useState<SpoolView | null>(null);
  const [presetMaterialId, setPresetMaterialId] = useState<number | null>(null);
  // Bumped on every open so the dialog remounts with fresh field state
  const [formInstance, setFormInstance] = useState(0);

  const allSpools: SpoolView[] = useMemo(
    () => inventory.flatMap((m) => m.spools),
    [inventory],
  );
  const inStock = useMemo(() => allSpools.filter((s) => !s.isEmpty), [allSpools]);
  const empty = useMemo(() => allSpools.filter((s) => s.isEmpty), [allSpools]);

  const activeGroup: DashboardGroup | null = filter.startsWith("group-")
    ? (groups.find((g) => `group-${g.id}` === filter) ?? null)
    : null;

  const openBorrows: number = myLends.filter(
    (l) => l.lend.status === "requested" || l.lend.status === "active",
  ).length;

  // Which spools are visible under the current tab (per material)
  const visibleByMaterial = useMemo(() => {
    const spoolFilter = (s: SpoolView) =>
      filter === "in-stock" ? !s.isEmpty : filter === "empty" ? s.isEmpty : true;
    return inventory
      .map((m) => ({
        inventory: m,
        visibleIds: new Set(m.spools.filter(spoolFilter).map((s) => s.id)),
      }))
      .filter((entry) => entry.visibleIds.size > 0);
  }, [inventory, filter]);

  function openCreate(materialId: number | null = null) {
    setEditingSpool(null);
    setPresetMaterialId(materialId);
    setFormInstance((i) => i + 1);
    setFormOpen(true);
  }

  function openEdit(s: SpoolView) {
    setEditingSpool(s);
    setPresetMaterialId(null);
    setFormInstance((i) => i + 1);
    setFormOpen(true);
  }

  return (
    <div className="min-h-screen">
      <AppHeader user={user} unreadCount={unreadCount} />
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <FilamentStats
          materialCount={inventory.length}
          inStock={inStock}
          empty={empty}
        />
        <div className="mt-8 flex items-center justify-between gap-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="in-stock">
                In stock ({inStock.length})
              </TabsTrigger>
              <TabsTrigger value="empty">Empty ({empty.length})</TabsTrigger>
              <TabsTrigger value="all">All ({allSpools.length})</TabsTrigger>
              {groups.length > 0 && (
                <TabsTrigger value="borrows">
                  <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />
                  Borrows ({openBorrows})
                </TabsTrigger>
              )}
              {groups.map((g) => (
                <TabsTrigger key={g.id} value={`group-${g.id}`}>
                  <UsersRound className="mr-1 h-3.5 w-3.5" />
                  {g.name} ({g.stock.length})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            onClick={() => openCreate()}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add spool
          </Button>
        </div>

        {filter === "borrows" ? (
          <section className="mt-6">
            <BorrowsPanel lends={myLends} currentUserId={user.id} />
          </section>
        ) : activeGroup ? (
          <section className="mt-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Spools shared in {activeGroup.name}.
              </p>
              <Link
                href={`/groups/${activeGroup.id}`}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Manage group →
              </Link>
            </div>
            <GroupStock
              groupId={activeGroup.id}
              spools={activeGroup.stock}
              currentUserId={user.id}
            />
          </section>
        ) : visibleByMaterial.length === 0 ? (
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
                onClick={() => openCreate()}
                className="bg-transparent"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add spool
              </Button>
            )}
          </div>
        ) : (
          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleByMaterial.map(({ inventory: m, visibleIds }) => (
              <MaterialCard
                key={m.material.id}
                inventory={m}
                visibleSpoolIds={visibleIds}
                onEditSpool={openEdit}
                onAddSpool={openCreate}
              />
            ))}
          </section>
        )}
      </main>

      <SpoolFormDialog
        key={`${editingSpool ? `edit-${editingSpool.id}` : "create"}-${formInstance}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        spool={editingSpool}
        presetMaterialId={presetMaterialId}
        materials={usableMaterials}
        spoolTypes={spoolTypes}
      />
    </div>
  );
}
