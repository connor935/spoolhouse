'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, UsersRound, ArrowLeftRight } from 'lucide-react';
import { BorrowsDialog } from '@/components/warehouseDashboard/borrows-dialog';
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

// Top-level tabs: your own stock, or one per group. Status (in-stock/empty/all)
// and borrows are no longer tabs — status is a filter, borrows is a modal.
type Tab = 'stock' | `group-${number}`;

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
    'stock',
    ...groups.map((g) => `group-${g.id}`),
  ]);
  const [tab, setTab] = useState<Tab>(
    validTabs.has(initialTab) ? (initialTab as Tab) : 'stock'
  );
  const [filters, setFilters] = useState<InventoryFilters>(initialFilters);
  const [borrowsOpen, setBorrowsOpen] = useState(false);

  // Mirror tab + filters into the URL (replaceState: shareable links, no
  // navigation/server round-trip per keystroke, back button stays sane).
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== 'stock') params.set('tab', tab);
    if (filters.status !== 'in-stock') params.set('status', filters.status);
    if (filters.q.trim() !== '') params.set('q', filters.q.trim());
    if (filters.filamentType) params.set('type', filters.filamentType);
    if (filters.minLeftGrams !== null)
      params.set('minLeft', String(filters.minLeftGrams));
    if (filters.hideLent) params.set('hideLent', '1');
    const qs = params.toString();
    globalThis.history.replaceState(null, '', qs ? `/?${qs}` : '/');
  }, [tab, filters]);
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

  const activeGroup: DashboardGroup | null = tab.startsWith('group-')
    ? (groups.find((g) => `group-${g.id}` === tab) ?? null)
    : null;

  const openBorrows: number = myLends.filter(
    (l) => l.lend.status === 'requested' || l.lend.status === 'active'
  ).length;

  // Which spools are visible in "Your stock" (per material), combined with the
  // status selector + search/filter bar (Epic 5)
  const visibleByMaterial = useMemo(() => {
    const spoolFilter = (s: SpoolView) => {
      if (filters.status === 'in-stock' && s.isEmpty) return false;
      if (filters.status === 'empty' && !s.isEmpty) return false;
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
  }, [inventory, filters]);

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

  // Borrows + Add spool. Rendered twice: pinned to the tabs row on desktop
  // (`full={false}`, natural width) and as a full-width row under the filter on
  // mobile (`full={true}`, buttons split the row). Borrows only exists in groups.
  const renderActions = (full: boolean) => (
    <>
      {groups.length > 0 && (
        <Button
          variant="outline"
          onClick={() => setBorrowsOpen(true)}
          className={cn('relative', full && 'flex-1')}
        >
          <ArrowLeftRight className="mr-1 h-4 w-4" />
          Borrows
          {openBorrows > 0 && (
            <span className="bg-accent text-accent-foreground absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] font-semibold">
              {openBorrows > 9 ? '9+' : openBorrows}
            </span>
          )}
        </Button>
      )}
      <Button
        onClick={() => openCreate()}
        className={cn(
          'bg-accent text-accent-foreground hover:bg-accent/90',
          full && 'flex-1'
        )}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add spool
      </Button>
    </>
  );

  return (
    <div className="min-h-screen">
      <AppHeader user={user} unreadCount={unreadCount} />
      <main className="mx-auto flex max-w-7xl flex-col gap-4 p-4 md:gap-6 md:p-6">
        {/* <FilamentStats
          materialCount={inventory.length}
          inStock={inStock}
          empty={empty}
        /> */}
        {groups.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 overflow-x-auto overflow-y-hidden">
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <TabsList>
                  <TabsTrigger value="stock">
                    <Package className="mr-1 h-3.5 w-3.5" />
                    Your stock
                  </TabsTrigger>
                  {groups.map((g) => (
                    <TabsTrigger key={g.id} value={`group-${g.id}`}>
                      <UsersRound className="mr-1 h-3.5 w-3.5" />
                      {g.name} ({g.stock.length})
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            {/* Desktop: actions sit in the tabs row. Hidden on mobile. */}
            <div className="hidden shrink-0 items-center gap-2 md:flex">
              {renderActions(false)}
            </div>
          </div>
        )}

        <div className="flex w-full flex-col items-center gap-4 md:flex-row">
          <InventoryFilter
            value={filters}
            onChange={setFilters}
            showStatus={activeGroup === null}
            showHideLent={activeGroup !== null}
            statusCounts={{
              inStock: inStock.length,
              empty: empty.length,
              all: allSpools.length,
            }}
          />
          {/* Mobile: actions in one row under the filter. On desktop with groups
              they live in the tabs row (hidden here); without groups they sit
              inline beside the filter. */}
          <div
            className={cn(
              'flex gap-2',
              groups.length > 0 ? 'w-full md:hidden' : 'w-full md:w-auto'
            )}
          >
            {renderActions(true)}
          </div>
        </div>

        {activeGroup ? (
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
                  : filters.status === 'empty'
                    ? "You haven't used up any spools yet."
                    : 'Add your first spool to start tracking inventory.'}
              </p>
            </div>
            {filters.status !== 'empty' && !filtersActive(filters) && (
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

      <BorrowsDialog
        open={borrowsOpen}
        onOpenChange={setBorrowsOpen}
        lends={myLends}
        currentUserId={user.id}
      />
    </div>
  );
}
