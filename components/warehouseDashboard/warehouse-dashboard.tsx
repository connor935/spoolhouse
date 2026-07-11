'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, UsersRound, ArrowLeftRight } from 'lucide-react';
import { BorrowsPanel } from '@/components/borrows-panel';
import { GroupStock } from '@/components/group-stock';
import {
  InventoryFilter,
  filtersActive,
  type InventoryFilters,
} from '@/components/inventory-filter';
import { MaterialCard } from '@/components/warehouseDashboard/material-card';
import { SpoolFormDialog } from '@/components/warehouseDashboard/spoolForm/spool-form-dialog';
import type { MaterialInventory, SpoolView } from '@/lib/filament';
import type { MyLend } from '@/app/actions/lends';
import type { Material, SpoolType } from '@/lib/db/schema';
import type { SharedSpool } from '@/lib/sharing';
import Link from 'next/link';
import { AppHeader } from '../app-header';
import { FilamentStats } from '../filament-stats';

type Filter = 'in-stock' | 'empty' | 'all' | 'borrows' | `group-${number}`;

type DashboardGroup = { id: number; name: string; stock: SharedSpool[] };

function materialMatches(
  m: { name: string; manufacturer: string; filamentType: string },
  f: InventoryFilters
): boolean {
  if (f.filamentType && m.filamentType !== f.filamentType) return false;
  const q = f.q.trim().toLowerCase();
  if (q === '') return true;
  return (
    m.name.toLowerCase().includes(q) || m.manufacturer.toLowerCase().includes(q)
  );
}

export function WarehouseDashboard({
  inventory,
  usableMaterials,
  spoolTypes,
  groups,
  myLends,
  unreadCount,
  user,
  initialTab,
  initialFilters,
}: {
  inventory: MaterialInventory[];
  usableMaterials: Material[];
  spoolTypes: SpoolType[];
  groups: DashboardGroup[];
  myLends: MyLend[];
  unreadCount: number;
  user: { id: string; name: string; isAdmin: boolean };
  initialTab: string;
  initialFilters: InventoryFilters;
}) {
  const validTabs = new Set<string>([
    'in-stock',
    'empty',
    'all',
    'borrows',
    ...groups.map((g) => `group-${g.id}`),
  ]);
  const [filter, setFilter] = useState<Filter>(
    validTabs.has(initialTab) ? (initialTab as Filter) : 'in-stock'
  );
  const [filters, setFilters] = useState<InventoryFilters>(initialFilters);

  // Mirror tab + filters into the URL (replaceState: shareable links, no
  // navigation/server round-trip per keystroke, back button stays sane).
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== 'in-stock') params.set('tab', filter);
    if (filters.q.trim() !== '') params.set('q', filters.q.trim());
    if (filters.filamentType) params.set('type', filters.filamentType);
    if (filters.minLeftGrams !== null)
      params.set('minLeft', String(filters.minLeftGrams));
    if (filters.hideLent) params.set('hideLent', '1');
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `/?${qs}` : '/');
  }, [filter, filters]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpool, setEditingSpool] = useState<SpoolView | null>(null);
  const [presetMaterialId, setPresetMaterialId] = useState<number | null>(null);
  // Bumped on every open so the dialog remounts with fresh field state
  const [formInstance, setFormInstance] = useState(0);

  const allSpools: SpoolView[] = useMemo(
    () => inventory.flatMap((m) => m.spools),
    [inventory]
  );
  const inStock = useMemo(
    () => allSpools.filter((s) => !s.isEmpty),
    [allSpools]
  );
  const empty = useMemo(() => allSpools.filter((s) => s.isEmpty), [allSpools]);

  const activeGroup: DashboardGroup | null = filter.startsWith('group-')
    ? (groups.find((g) => `group-${g.id}` === filter) ?? null)
    : null;

  const openBorrows: number = myLends.filter(
    (l) => l.lend.status === 'requested' || l.lend.status === 'active'
  ).length;

  // Which spools are visible under the current tab (per material),
  // combined with the search/filter bar (Epic 5)
  const visibleByMaterial = useMemo(() => {
    const spoolFilter = (s: SpoolView) => {
      if (filter === 'in-stock' && s.isEmpty) return false;
      if (filter === 'empty' && !s.isEmpty) return false;
      if (
        filters.minLeftGrams !== null &&
        s.filamentLeftGrams < filters.minLeftGrams
      )
        return false;
      return true;
    };
    return inventory
      .filter((m) => materialMatches(m.material, filters))
      .map((m) => ({
        inventory: m,
        visibleIds: new Set(m.spools.filter(spoolFilter).map((s) => s.id)),
      }))
      .filter((entry) => entry.visibleIds.size > 0);
  }, [inventory, filter, filters]);

  // Group stock filtered by the same bar (+ hide-lent)
  const filteredGroupStock = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.stock.filter((s) => {
      if (!materialMatches(s.material, filters)) return false;
      if (
        filters.minLeftGrams !== null &&
        s.filamentLeftGrams < filters.minLeftGrams
      )
        return false;
      if (filters.hideLent && s.lentTo) return false;
      return true;
    });
  }, [activeGroup, filters]);

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
      <main className="mx-auto flex max-w-7xl flex-col gap-4 p-4 md:gap-6 md:p-6">
        {/* <FilamentStats
          materialCount={inventory.length}
          inStock={inStock}
          empty={empty}
        /> */}
        <div className="flex items-center justify-between gap-4">
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
        </div>

        {filter !== 'borrows' && (
          <div className="flex w-full items-center gap-4">
            <InventoryFilter
              value={filters}
              onChange={setFilters}
              showHideLent={activeGroup !== null}
            />
            <Button
              onClick={() => openCreate()}
              className="bg-accent text-accent-foreground text-md hover:bg-accent/90 h-auto self-stretch"
            >
              <Plus className="mr-1 size-6" />
              Add spool
            </Button>
          </div>
        )}

        {filter === 'borrows' ? (
          <BorrowsPanel lends={myLends} currentUserId={user.id} />
        ) : activeGroup ? (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-muted-foreground text-sm">
                Spools shared in {activeGroup.name}
                {filtersActive(filters)
                  ? ` — ${filteredGroupStock.length} of ${activeGroup.stock.length} match`
                  : '.'}
              </p>
              <Link
                href={`/groups/${activeGroup.id}`}
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
              >
                Manage group →
              </Link>
            </div>
            {filteredGroupStock.length === 0 && filtersActive(filters) ? (
              <div className="border-border bg-card/50 text-muted-foreground rounded-lg border border-dashed px-6 py-10 text-center text-sm">
                No shared spools match the current filters.
              </div>
            ) : (
              <GroupStock
                groupId={activeGroup.id}
                spools={filteredGroupStock}
                currentUserId={user.id}
              />
            )}
          </section>
        ) : visibleByMaterial.length === 0 ? (
          <div className="border-border bg-card/50 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
            <Package className="text-muted-foreground h-8 w-8" />
            <div>
              <p className="font-medium">
                {filtersActive(filters) ? 'No matches' : 'No spools here'}
              </p>
              <p className="text-muted-foreground text-sm">
                {filtersActive(filters)
                  ? 'No materials match the current filters.'
                  : filter === 'empty'
                    ? "You haven't used up any spools yet."
                    : 'Add your first spool to start tracking inventory.'}
              </p>
            </div>
            {filter !== 'empty' && !filtersActive(filters) && (
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
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        key={`${editingSpool ? `edit-${editingSpool.id}` : 'create'}-${formInstance}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        spool={editingSpool}
        presetMaterialId={presetMaterialId}
        materials={usableMaterials}
        spoolTypes={spoolTypes}
        isAdmin={user.isAdmin}
      />
    </div>
  );
}
