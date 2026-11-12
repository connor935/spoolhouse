import { MaterialReviewContainer } from '@/components/catalog/review-queue';
import { requireAdmin } from '@/lib/auth-session';
import { getMaterialReviewQueue } from '@/lib/catalog-review';
import { parseReviewSkip } from '@/lib/review-skip';

export const dynamic = 'force-dynamic';

export default async function MaterialReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const skip = parseReviewSkip((await searchParams).skip);
  const data = await getMaterialReviewQueue(skip);
  return <MaterialReviewContainer data={data} now={new Date()} />;
}
