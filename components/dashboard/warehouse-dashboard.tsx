'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, UsersRound, ArrowLeftRight } from 'lucide-react';
import { BorrowsDialog } from '@/components/dashboard/borrows-dialog';
import { GroupStock } from '@/components/groups/group-stock';
import {
  InventoryFilter,
  InventoryFilterPanel,
  filtersActive,
  type InventoryFilters,
} from '@/components/dashboard/inventory-filter';
import { MaterialCard } from '@/components/dashboard/material-card';
import { SpoolFormDialog } from '@/components/dashboard/spool-form/spool-form-dialog';
import { useUrlSyncedFilters } from '@/hooks/use-url-synced-filters';
import {
  filterGroupStock,
  visibleMaterialEntries,
} from '@/lib/inventory-filter';
import type { MaterialInventory, SpoolView } from '@/lib/filament';
import type { MyLend } from '@/app/actions/lends';
import type { Material, Property, SpoolType } from '@/lib/db/schema';
import type { MaterialPropertyView } from '@/lib/material-properties';
import type { SharedSpool } from '@/lib/sharing';
import type { MaterialUsage } from '@/lib/usage-stats';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/app-header';
import { MaterialDialog } from './material-dialog';

// Top-level tabs: your own stock, or one per group. Status (in-stock/empty/all)
// and borrows are no longer tabs — status is a filter, borrows is a modal.
type Tab = 'stock' | `group-${number}`;

type DashboardGroup = { id: string; name: string; stock: SharedSpool[] };

export function WarehouseDashboard({
  inventory,
  spoolTypes,
  groups,
  myLends,
  unreadCount,
  user,
  initialTab,
  initialFilters,
  propertiesByMaterialId,
  propertyDefinitions,
  materialUsage,
}: {
  inventory: MaterialInventory[];
  spoolTypes: SpoolType[];
  groups: DashboardGroup[];
  myLends: MyLend[];
  unreadCount: number;
  user: { id: string; name: string; isAdmin: boolean };
  initialTab: string;
  initialFilters: InventoryFilters;
  propertiesByMaterialId: Record<string, MaterialPropertyView[]>;
  propertyDefinitions: Property[];
  materialUsage: Record<string, MaterialUsage>;
}) {
  const validTabs = new Set<string>([
    'stock',
    ...groups.map((g) => `group-${g.id}`),
  ]);
  const [tab, setTab] = useState<Tab>(
    validTabs.has(initialTab) ? (initialTab as Tab) : 'stock'
  );
  const [filters, setFilters] = useState<InventoryFilters>(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [borrowsOpen, setBorrowsOpen] = useState(false);
  const [openMaterialDialog, setOpenMaterialDialog] = useState(false);
  // Store the id, not the object: after router.refresh() the inventory array
  // is rebuilt, so deriving the material (and its properties) from the fresh
  // data keeps an open dialog in sync with just-saved property edits.
  const [dialogMaterialId, setDialogMaterialId] = useState<string | null>(null);

  useUrlSyncedFilters(tab, filters);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpool, setEditingSpool] = useState<SpoolView | null>(null);
  const [presetMaterialId, setPresetMaterialId] = useState<string | null>(null);
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
  const locations = useMemo(
    () =>
      [
        ...new Set(allSpools.flatMap((s) => (s.location ? [s.location] : []))),
      ].sort((a, b) => a.localeCompare(b)),
    [allSpools]
  );

  const activeGroup: DashboardGroup | null = tab.startsWith('group-')
    ? (groups.find((g) => `group-${g.id}` === tab) ?? null)
    : null;

  const openBorrows: number = myLends.filter(
    (l) => l.lend.status === 'requested' || l.lend.status === 'active'
  ).length;

  // Which spools are visible in "Your stock" (per material), combined with the
  // status selector + search/filter bar (Epic 5)
  const visibleByMaterial = useMemo(
    () => visibleMaterialEntries(inventory, filters, propertiesByMaterialId),
    [inventory, filters, propertiesByMaterialId]
  );

  // Group stock filtered by the same bar (+ hide-lent)
  const filteredGroupStock = useMemo(() => {
    if (!activeGroup) return [];
    return filterGroupStock(activeGroup.stock, filters, propertiesByMaterialId);
  }, [activeGroup, filters, propertiesByMaterialId]);

  // The dialog needs the Material object, not an id — the picker searches the
  // catalog server-side and no longer has a full list to resolve one from.
  // Every material the user can edit or add to is already in `inventory`.
  const initialMaterial = useMemo(() => {
    const id = editingSpool?.materialId ?? presetMaterialId;
    if (!id) return null;
    return inventory.find((m) => m.material.id === id)?.material ?? null;
  }, [editingSpool, presetMaterialId, inventory]);

  function openCreate(materialId: string | null = null) {
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

  function openMaterialDetails(m: MaterialInventory) {
    setDialogMaterialId(m.material.id);
    setOpenMaterialDialog(true);
  }

  // Derived from the current inventory so it reflects fresh data after a
  // router.refresh() (e.g. a just-saved property value).
  const dialogMaterial =
    inventory.find((m) => m.material.id === dialogMaterialId) ?? null;

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

  const filterPanel = (
    <InventoryFilterPanel
      value={filters}
      onChange={setFilters}
      showStatus={activeGroup === null}
      showHideLent={activeGroup !== null}
      statusCounts={{
        inStock: inStock.length,
        empty: empty.length,
        all: allSpools.length,
      }}
      propertyDefinitions={propertyDefinitions}
    />
  );

  return (
    <div className="min-h-screen">
      <AppHeader user={user} unreadCount={unreadCount} />
      <main className="mx-auto flex max-w-7xl flex-col gap-4 p-4 md:gap-6 md:p-6">
        {groups.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 overflow-x-auto overflow-y-hidden">
              <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <TabsList>
                  <TabsTrigger value="stock">
                    <Package className="mr-1 h-3.5 w-3.5" />
                    Your stock {allSpools.length > 0 && `(${allSpools.length})`}
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

        <div className="flex w-full flex-col items-center gap-4 md:flex-row md:items-start">
          <InventoryFilter
            value={filters}
            onChange={setFilters}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((o) => !o)}
          />
          {/* Mobile: actions in one row under the filter. On desktop with
              groups they live in the tabs row (hidden here); without groups
              they sit inline beside the filter. */}
          <div
            className={cn(
              'flex gap-2',
              groups.length > 0 ? 'w-full md:hidden' : 'w-full md:w-auto'
            )}
          >
            {renderActions(true)}
          </div>
        </div>

        {/* Advanced filters drop in below the bar on every device. */}
        {filtersOpen && filterPanel}

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
                onOpenMaterialDialog={openMaterialDetails}
                dryingTemp={
                  propertiesByMaterialId[m.material.id]?.find(
                    (p) => p.key === 'drying_temp'
                  )?.value
                }
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
        initialMaterial={initialMaterial}
        spoolTypes={spoolTypes}
        locations={locations}
        isAdmin={user.isAdmin}
      />

      <MaterialDialog
        open={openMaterialDialog}
        onOpenChange={setOpenMaterialDialog}
        inventoryMaterial={dialogMaterial}
        propertyValues={
          dialogMaterialId
            ? (propertiesByMaterialId[dialogMaterialId] ?? [])
            : []
        }
        propertyDefinitions={propertyDefinitions}
        usage={dialogMaterialId ? materialUsage[dialogMaterialId] : undefined}
        isAdmin={user.isAdmin}
        onAddSpool={openCreate}
        onEditSpool={openEdit}
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
