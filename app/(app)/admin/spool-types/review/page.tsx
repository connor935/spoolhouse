import { SpoolTypeReviewContainer } from '@/components/catalog/review-queue';
import { requireAdmin } from '@/lib/auth-session';
import { getSpoolTypeReviewQueue } from '@/lib/catalog-review';
import { parseReviewSkip } from '@/lib/review-skip';

export const dynamic = 'force-dynamic';

export default async function SpoolTypeReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const skip = parseReviewSkip((await searchParams).skip);
  const data = await getSpoolTypeReviewQueue(skip);
  return <SpoolTypeReviewContainer data={data} now={new Date()} />;
}
