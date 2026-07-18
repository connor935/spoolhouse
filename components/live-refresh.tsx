'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PUBLIC_PREFIXES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
];

// Subscribes to /api/events (SSE) and refreshes the current route whenever the
// server signals that this user's data changed (e.g. the NFC scale wrote a
// weight via the REST API). Mounted once in app/layout.tsx; renders nothing.
//
// The effect is keyed on the public/private boolean, not the pathname: login
// and logout are client-side navigations that never remount the root layout,
// so this is what opens the stream after login and closes it after logout —
// without reconnecting on every ordinary navigation. Note that on HTTP/1.1
// (plain `next dev`) browsers cap ~6 connections per origin, so many parallel
// tabs can starve; behind the HTTP/2 reverse proxy in production this is moot.
export function LiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isPublic) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let everOpened = false;

    // Trailing debounce coalesces bursts (a weigh-in plus its notification
    // emit arrive within milliseconds) into a single server round-trip.
    const debouncedRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    const es = new EventSource('/api/events');
    es.onmessage = debouncedRefresh;
    es.onopen = () => {
      // After a reconnect, catch whatever was missed while disconnected.
      if (everOpened) router.refresh();
      everOpened = true;
    };

    // Mobile-PWA safety net: the OS may freeze the tab and kill the socket
    // without an error event, so refresh once when it becomes visible again.
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      es.close();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isPublic, router]);

  return null;
}
