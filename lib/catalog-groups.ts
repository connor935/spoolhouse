// Catalog rows grouped under manufacturer headers, in the order the (already
// sorted) query returned them. `totals` are per-manufacturer match counts
// from the server; without one, a group counts the rows it shows.
export function groupByManufacturer<T>(
  rows: readonly T[],
  manufacturerOf: (row: T) => string,
  totals: Record<string, number> = {}
): { manufacturer: string; total: number; entries: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = manufacturerOf(row);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups].map(([manufacturer, entries]) => ({
    manufacturer,
    total: totals[manufacturer] ?? entries.length,
    entries,
  }));
}
