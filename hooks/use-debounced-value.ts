'use client';

import { useEffect, useState } from 'react';

// Trailing debounce for a value that drives a request — typing in the material
// picker shouldn't hit the server on every keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 150): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
