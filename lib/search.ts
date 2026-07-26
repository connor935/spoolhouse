// Free-text matching for the material/spool-type searches (pickers, catalogs,
// dashboard filter bar).
//
// Every one of these used to test whether a single field contained the whole
// query string, so any query spanning two fields found nothing: "polymaker red"
// matched no row, because the manufacturer lives in one column and the colour
// word inside `name`. Matching per token across all fields is what makes the way
// people actually type — brand, then type, then colour — work.

// Whitespace-separated, lowercased query tokens. Callers tokenize once and reuse
// the result across the whole list.
export function searchTokens(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

// True when every token appears in at least one field (tokens may match
// different fields). An empty token list matches everything.
export function matchesTokens(
  tokens: string[],
  ...fields: (string | null | undefined)[]
): boolean {
  if (tokens.length === 0) return true;
  const haystack = fields
    .filter((f): f is string => !!f)
    .join(' ')
    .toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

// Ranks a match so the capped result lists show the obvious candidates first:
// a field that *starts* with a token (typing "poly" for Polymaker) beats one
// that merely contains it somewhere. Lower sorts first; use with a stable sort
// so the caller's existing order survives within a rank.
export function matchRank(
  tokens: string[],
  ...fields: (string | null | undefined)[]
): number {
  if (tokens.length === 0) return 1;
  const values = fields
    .filter((f): f is string => !!f)
    .map((f) => f.toLowerCase());
  const startsWithToken = values.some((v) =>
    tokens.some((t) => v.startsWith(t))
  );
  return startsWithToken ? 0 : 1;
}
