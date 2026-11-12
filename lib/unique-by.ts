/** First item per key, in order — merges overlapping result pages. */
export function uniqueBy<T>(
  items: readonly T[],
  keyOf: (item: T) => string
): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
