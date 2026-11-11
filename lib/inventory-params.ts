// /inventory's view state ⇄ URL search params, so a filtered view is a
// shareable link. Parsed server-side by the page, written back client-side
// with history.replaceState. Also maps the old tabbed dashboard's links
// (`/?tab=…&q=…`) onto the pages that replaced it.
import { EMPTY_FILTER_VALUE, type FilterValue } from '@/lib/filter-value';
import { parseConstraints, serializeConstraints } from '@/lib/property-filter';

export type StockStatus = 'in-stock' | 'empty' | 'all';

export type InventoryQuery = FilterValue & {
  status: StockStatus;
  q: string;
};

export const DEFAULT_INVENTORY_QUERY: InventoryQuery = {
  ...EMPTY_FILTER_VALUE,
  status: 'in-stock',
  q: '',
};

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function reader(params: Params) {
  return (key: string): string => {
    const v = params instanceof URLSearchParams ? params.get(key) : params[key];
    return typeof v === 'string' ? v : '';
  };
}

const STATUSES: readonly StockStatus[] = ['in-stock', 'empty', 'all'];

// hideLent is not read: it only applies to group stock.
export function parseInventoryParams(params: Params): InventoryQuery {
  const get = reader(params);
  const minLeft = Number.parseInt(get('minLeft'), 10);
  const status = get('status') as StockStatus;
  return {
    ...DEFAULT_INVENTORY_QUERY,
    status: STATUSES.includes(status) ? status : 'in-stock',
    q: get('q'),
    filamentTypes: get('type')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    minLeftGrams: Number.isNaN(minLeft) ? null : minLeft,
    propertyConstraints: parseConstraints(get('props')),
  };
}

/** "?status=empty&q=…" for a query, '' for the default view. */
export function inventorySearch(query: InventoryQuery): string {
  const params = new URLSearchParams();
  if (query.status !== 'in-stock') params.set('status', query.status);
  if (query.q.trim() !== '') params.set('q', query.q.trim());
  if (query.filamentTypes.length > 0)
    params.set('type', query.filamentTypes.join(','));
  if (query.minLeftGrams !== null)
    params.set('minLeft', String(query.minLeftGrams));
  const props = serializeConstraints(query.propertyConstraints);
  if (props) params.set('props', props);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// Group ids are UUIDs; anything else in `tab` is not redirected anywhere.
const ID = /^[A-Za-z0-9-]+$/;
const STOCK_PARAMS = ['status', 'q', 'type', 'minLeft', 'props'];

/**
 * Where an old dashboard link (`/?tab=…`) lives now: `/borrows`,
 * `/groups/<id>` or `/inventory?…` with its filters; null = stay on the
 * Overview.
 */
export function legacyDashboardRedirect(params: Params): string | null {
  const get = reader(params);
  const tab = get('tab');
  if (tab === 'borrows') return '/borrows';
  if (tab && tab !== 'stock') {
    const id = tab.startsWith('group-') ? tab.slice('group-'.length) : tab;
    return ID.test(id) ? `/groups/${id}` : null;
  }
  if (tab === 'stock' || STOCK_PARAMS.some((key) => get(key) !== ''))
    return `/inventory${inventorySearch(parseInventoryParams(params))}`;
  return null;
}
