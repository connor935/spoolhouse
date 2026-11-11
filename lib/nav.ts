// Navigation model for the app shell (sidebar, mobile drawer, bottom nav).
// Pure: no server or Next imports, so the presentational shell components and
// their stories can use it. Counts come from getNavCounts() (lib/nav-counts.ts).
import {
  ArrowLeftRight,
  Bell,
  ChartColumn,
  Disc3,
  Download,
  LayoutDashboard,
  Layers,
  ListChecks,
  Package,
  SlidersHorizontal,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

/** Cookie holding the sidebar collapse state ("1" = collapsed), read on the
 *  server so SSR renders the right width. */
export const SIDEBAR_COOKIE = 'sidebar_collapsed';

export type NavGroup = { id: string; name: string; sharedCount: number };

export type NavCounts = {
  /** The user's own spools in stock (not empty). */
  inventory: number;
  /** Open borrow requests for the user's spools, waiting for their answer. */
  borrowRequests: number;
  unreadNotifications: number;
  /** Groups the user belongs to, with the size of each pooled stock. */
  groups: NavGroup[];
  /** Admin review queues; null for non-admins. */
  pendingMaterials: number | null;
  pendingSpoolTypes: number | null;
};

export type NavUser = { name: string; isAdmin: boolean };

/** `pill` = something waits for you (accent); `count` = informational (muted). */
export type NavBadge = { value: number; tone: 'pill' | 'count'; label: string };

export type NavItem = {
  key: string;
  href: string;
  label: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  children?: NavItem[];
};

export type NavSection = {
  key: 'main' | 'catalog' | 'admin';
  label?: string;
  items: NavItem[];
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

function badge(
  value: number | null,
  tone: NavBadge['tone'],
  label: (n: number) => string
): NavBadge | undefined {
  if (!value || value <= 0) return undefined;
  return { value, tone, label: label(value) };
}

/** Badge text: accent pills cap at "9+", plain counts show the number. */
export function badgeText({ value, tone }: NavBadge): string {
  return tone === 'pill' && value > 9 ? '9+' : String(value);
}

export const groupNavKey = (groupId: string) => `group:${groupId}`;

const openRequests = (n: number) => plural(n, 'open request', 'open requests');

export function buildNav(counts: NavCounts, isAdmin: boolean): NavSection[] {
  const pending = (n: number) => `${n} pending`;
  const sections: NavSection[] = [
    {
      key: 'main',
      items: [
        {
          key: 'overview',
          href: '/',
          label: 'Overview',
          icon: LayoutDashboard,
        },
        {
          key: 'inventory',
          href: '/inventory',
          label: 'Inventory',
          icon: Package,
          badge: badge(counts.inventory, 'count', (n) =>
            plural(n, 'spool in stock', 'spools in stock')
          ),
        },
        {
          key: 'borrows',
          href: '/borrows',
          label: 'Borrows',
          icon: ArrowLeftRight,
          badge: badge(counts.borrowRequests, 'pill', openRequests),
        },
        {
          key: 'groups',
          href: '/groups',
          label: 'Groups',
          icon: UsersRound,
          children: counts.groups.map((g) => ({
            key: groupNavKey(g.id),
            href: `/groups/${g.id}`,
            label: g.name,
            badge: badge(g.sharedCount, 'count', (n) =>
              plural(n, 'shared spool', 'shared spools')
            ),
          })),
        },
        {
          key: 'statistics',
          href: '/stats',
          label: 'Statistics',
          icon: ChartColumn,
        },
        {
          key: 'notifications',
          href: '/notifications',
          label: 'Notifications',
          icon: Bell,
          badge: badge(
            counts.unreadNotifications,
            'pill',
            (n) => `${n} unread`
          ),
        },
      ],
    },
    {
      key: 'catalog',
      label: 'Catalog',
      items: [
        {
          key: 'materials',
          href: '/materials',
          label: 'Materials',
          icon: Layers,
        },
        {
          key: 'spool-types',
          href: '/spool-types',
          label: 'Spool types',
          icon: Disc3,
        },
      ],
    },
  ];
  if (isAdmin) {
    sections.push({
      key: 'admin',
      label: 'Admin',
      items: [
        { key: 'users', href: '/admin/users', label: 'Users', icon: Users },
        {
          key: 'review-materials',
          href: '/admin/materials',
          label: 'Review materials',
          icon: ListChecks,
          badge: badge(counts.pendingMaterials, 'pill', pending),
        },
        {
          key: 'review-spool-types',
          href: '/admin/spool-types',
          label: 'Review spool types',
          icon: ListChecks,
          badge: badge(counts.pendingSpoolTypes, 'pill', pending),
        },
        {
          key: 'properties',
          href: '/admin/properties',
          label: 'Properties',
          icon: SlidersHorizontal,
        },
        {
          key: 'import',
          href: '/admin/import',
          label: 'Import catalog',
          icon: Download,
        },
      ],
    });
  }
  return sections;
}

/** Mobile bottom nav (MobileInventory.dc.html): five short-labelled items. */
export function buildBottomNav(counts: NavCounts): NavItem[] {
  return [
    { key: 'overview', href: '/', label: 'Home', icon: LayoutDashboard },
    { key: 'inventory', href: '/inventory', label: 'Stock', icon: Package },
    {
      key: 'borrows',
      href: '/borrows',
      label: 'Borrows',
      icon: ArrowLeftRight,
      badge: badge(counts.borrowRequests, 'pill', openRequests),
    },
    { key: 'groups', href: '/groups', label: 'Groups', icon: UsersRound },
    { key: 'statistics', href: '/stats', label: 'Stats', icon: ChartColumn },
  ];
}

/** The account page lives in the user menu, not in a section. */
export const ACCOUNT_NAV_ITEM = { key: 'account', href: '/account' } as const;

/** Every item of the given sections, children included, in order. */
export function flattenNav(sections: NavSection[]): NavItem[] {
  return sections.flatMap((s) =>
    s.items.flatMap((item) => [item, ...(item.children ?? [])])
  );
}

/**
 * Key of the item whose href best matches the path: an exact match or the
 * longest href that is a path prefix ("/groups/abc" → the group, "/groups" →
 * Groups). "/" only matches itself.
 */
export function findActiveKey(
  pathname: string,
  items: readonly { key: string; href: string }[]
): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  let best: { key: string; length: number } | null = null;
  for (const { key, href } of items) {
    const matches =
      path === href || (href !== '/' && path.startsWith(`${href}/`));
    if (matches && (!best || href.length > best.length)) {
      best = { key, length: href.length };
    }
  }
  return best?.key ?? null;
}
