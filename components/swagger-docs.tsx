'use client';

import { useEffect, useRef } from 'react';
import 'swagger-ui-dist/swagger-ui.css';

// Renders Swagger UI for the given OpenAPI spec URL. swagger-ui-dist is
// loaded lazily in the effect so the (window-dependent) bundle never runs
// during SSR and doesn't bloat other pages.
export function SwaggerDocs({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { SwaggerUIBundle } = await import('swagger-ui-dist');
      if (cancelled || !ref.current) return;
      ref.current.replaceChildren();
      SwaggerUIBundle({
        url,
        domNode: ref.current,
        deepLinking: true,
        // The API is same-origin, so "Try it out" works with a pasted token
        persistAuthorization: true,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return <div ref={ref} />;
}
