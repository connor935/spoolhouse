import { openApiSpec } from '@/lib/openapi';

// GET /api/v1/openapi.json — machine-readable API description (docs only,
// no data, so intentionally unauthenticated). Rendered by /api-docs.
export function GET() {
  return Response.json(openApiSpec);
}
