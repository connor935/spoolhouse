'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { SelectField } from '@/components/common/select-field';
import { SectionHeader } from '@/components/common/section-header';
import { Swatch } from '@/components/inventory/swatch';
import { WeightDisplay } from '@/components/inventory/weight-display';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  filterStock,
  groupStockByMaterial,
  type GroupStockFilters,
} from '@/lib/group-stock';
import type { SharedSpool } from '@/lib/sharing';
import { GroupStockRow } from '../group-stock-row';
import type { ShareMode } from '../share-mode-picker';

export type StockMember = {
  id: string;
  name: string;
  role: 'owner' | 'member';
  sharedCount: number;
};

type GroupStockViewProps = {
  stock: SharedSpool[];
  /** Spool id → the owner's "#03" number. */
  spoolNumbers: Record<string, number>;
  currentUserId: string;
  members: StockMember[];
  mySharing: { mode: ShareMode; visible: number; total: number };
  settingsHref: string;
  /** Spool id whose action is running. */
  pendingId?: string | null;
  onRequest: (spoolId: string) => void;
  onCancelRequest: (spool: SharedSpool) => void;
  onMarkReturned: (spool: SharedSpool) => void;
  /** Materials shown before "Load more". */
  pageSize?: number;
};

const ALL = 'all';

const MODE_LABEL: Record<ShareMode, string> = {
  all: 'share all',
  whitelist: 'whitelist',
  blacklist: 'blacklist',
};

/**
 * The group page's Stock view (Group board): pooled stock grouped by
 * material across owners, filters, members and your sharing summary.
 */
function GroupStockView({
  stock,
  spoolNumbers,
  currentUserId,
  members,
  mySharing,
  settingsHref,
  pendingId,
  onRequest,
  onCancelRequest,
  onMarkReturned,
  pageSize = 12,
}: GroupStockViewProps) {
  const [filters, setFilters] = useState<GroupStockFilters>({
    q: '',
    filamentType: null,
    ownerId: null,
    hideLent: false,
  });
  const [shown, setShown] = useState(pageSize);
  const update = (patch: Partial<GroupStockFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setShown(pageSize);
  };

  const groups = useMemo(
    () => groupStockByMaterial(filterStock(stock, filters), currentUserId),
    [stock, filters, currentUserId]
  );
  const types = useMemo(
    () => [...new Set(stock.map((s) => s.material.filamentType))].sort(),
    [stock]
  );

  return (
    <div data-slot="group-stock-view" className="flex flex-col gap-6">
      <div
        role="toolbar"
        aria-label="Filter shared spools"
        className="flex flex-wrap items-center gap-2.5"
      >
        <Input
          type="search"
          aria-label="Search shared spools"
          placeholder="Search manufacturer, material or color…"
          value={filters.q}
          onChange={(e) => update({ q: e.target.value })}
          className="flex-[1_1_280px]"
        />
        <SelectField
          ariaLabel="Filament type"
          value={filters.filamentType ?? ALL}
          onValueChange={(v) => update({ filamentType: v === ALL ? null : v })}
          items={[
            { value: ALL, label: 'All types' },
            ...types.map((t) => ({ value: t, label: t })),
          ]}
        />
        <SelectField
          ariaLabel="Member"
          value={filters.ownerId ?? ALL}
          onValueChange={(v) => update({ ownerId: v === ALL ? null : v })}
          items={[
            { value: ALL, label: 'All members' },
            ...members.map((m) => ({
              value: m.id,
              label: m.id === currentUserId ? 'You' : m.name,
            })),
          ]}
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={filters.hideLent}
            onCheckedChange={(checked) => update({ hideLent: checked })}
          />
          Hide lent
        </label>
      </div>

      <div className="flex flex-wrap items-start gap-10">
        <div className="flex min-w-0 flex-[3_1_660px] flex-col gap-7">
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {stock.length === 0
                ? 'Nobody shares spools in this group yet.'
                : 'No shared spools match these filters.'}
            </p>
          ) : (
            groups.slice(0, shown).map((g) => (
              <section
                key={g.material.id}
                aria-label={g.material.name}
                className="flex flex-col"
              >
                <div className="border-ink flex flex-wrap items-center gap-2.5 border-b pb-2">
                  <Swatch color={g.material.color} size="md" decorative />
                  <h3 className="display-name m-0 text-[22px]">
                    {g.material.name}
                  </h3>
                  <Badge>{g.material.filamentType}</Badge>
                  <span className="kicker">{g.material.manufacturer}</span>
                  <span className="ml-auto flex items-baseline gap-1.5">
                    <WeightDisplay grams={g.totalLeftGrams} />
                    <span className="kicker">
                      · {g.spools.length} spool
                      {g.spools.length === 1 ? '' : 's'}
                    </span>
                  </span>
                </div>
                <ul className="[&>li:first-child]:border-t-0">
                  {g.spools.map((s) => (
                    <GroupStockRow
                      key={s.id}
                      spool={s}
                      number={spoolNumbers[s.id]}
                      currentUserId={currentUserId}
                      lentSince={s.lentTo?.since}
                      pending={pendingId === s.id}
                      onRequest={() => onRequest(s.id)}
                      onCancelRequest={() => onCancelRequest(s)}
                      onMarkReturned={() => onMarkReturned(s)}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
          {groups.length > shown && (
            <div className="flex items-center gap-3">
              <span className="kicker">
                {shown} of {groups.length} materials
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShown((n) => n + pageSize)}
              >
                Load more
              </Button>
            </div>
          )}
        </div>

        <aside className="flex min-w-0 flex-[1_1_260px] flex-col gap-7">
          <section aria-labelledby="group-members">
            <SectionHeader
              id="group-members"
              index="A"
              title="Members"
              aside={<span className="kicker">Shared</span>}
            />
            <ul className="flex flex-col">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="border-border flex items-center gap-2.5 border-b py-2 text-sm last:border-b-0"
                >
                  <InitialsAvatar name={m.name} you={m.id === currentUserId} />
                  <span className="min-w-0 flex-1 truncate">
                    {m.name}
                    {m.id === currentUserId && (
                      <span className="text-muted-foreground"> (you)</span>
                    )}
                  </span>
                  {m.role === 'owner' && <Badge variant="muted">Owner</Badge>}
                  <span className="tabular font-mono">{m.sharedCount}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="group-my-sharing">
            <SectionHeader id="group-my-sharing" index="B" title="My sharing" />
            <p className="flex items-baseline gap-1">
              <span className="display-num">{mySharing.visible}</span>
              <span className="text-muted-foreground">/{mySharing.total}</span>
              <span className="kicker ml-1">spools visible</span>
            </p>
            <p className="kicker mt-1">
              Mode: {MODE_LABEL[mySharing.mode]} ·{' '}
              <Link
                href={settingsHref}
                className="text-accent underline underline-offset-4"
              >
                Change
              </Link>
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export { GroupStockView };
