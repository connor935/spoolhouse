import { getUsersForAdmin } from '@/app/actions/users';
import { UsersContainer } from '@/components/admin/users-view';
import { passwordMinLength, signupAllowed } from '@/lib/auth';
import { requireAdmin } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await getUsersForAdmin();
  return (
    <UsersContainer
      users={users}
      currentUserId={admin.id}
      minLength={passwordMinLength}
      signupOpen={signupAllowed}
    />
  );
}
