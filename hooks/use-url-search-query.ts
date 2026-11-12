'use client';

import { useEffect, useRef, useState } from 'react';

import { useDebouncedValue } from './use-debounced-value';

/**
 * A search box whose committed value lives in the URL `q` param. Typing
 * navigates once the input settles; a URL change from elsewhere (back/forward,
 * a link) is copied back into the box — but only once our own navigations
 * have landed (`busy` false), so an in-flight one never clobbers fresh typing.
 * Use `reset` for programmatic changes (Clear) that navigate on their own.
 */
export function useUrlSearchQuery(
  urlQuery: string,
  navigate: (query: string) => void,
  busy: boolean,
  delayMs = 300
) {
  const [query, setQuery] = useState(urlQuery);
  const [requested, setRequested] = useState(urlQuery);
  const [seen, setSeen] = useState(urlQuery);

  if (!busy && urlQuery !== seen) {
    setSeen(urlQuery);
    if (urlQuery.trim() !== requested.trim()) {
      setQuery(urlQuery);
      setRequested(urlQuery);
    }
  }

  const debounced = useDebouncedValue(query, delayMs);
  const latestNavigate = useRef(navigate);
  useEffect(() => {
    latestNavigate.current = navigate;
  });
  useEffect(() => {
    // Only act on a settled value: right after `reset` or a URL sync the
    // debounced copy still holds the old text, and navigating to it would
    // undo the change that just happened.
    if (debounced !== query) return;
    if (debounced.trim() === requested.trim()) return;
    setRequested(debounced);
    latestNavigate.current(debounced);
  }, [debounced, query, requested]);

  function reset(next: string) {
    setQuery(next);
    setRequested(next);
  }

  return { query, setQuery, reset };
}
