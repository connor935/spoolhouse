import { getMyLends } from '@/app/actions/lends';
import { BorrowsContainer } from '@/components/borrows/borrows-view';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function BorrowsPage() {
  const user = await requireUser();
  const lends = await getMyLends();
  return <BorrowsContainer lends={lends} userId={user.id} now={new Date()} />;
}
