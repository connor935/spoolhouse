import { authenticateApiRequest, unauthorized } from '@/lib/api-auth';

// GET /api/v1/me — identify the token owner (also serves as a token check).
export async function GET(request: Request) {
  const owner = await authenticateApiRequest(request);
  if (!owner) return unauthorized();
  return Response.json({
    id: owner.id,
    name: owner.name,
    email: owner.email,
    role: owner.role,
  });
}
