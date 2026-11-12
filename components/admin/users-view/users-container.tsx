'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { setTrustedContributor } from '@/app/actions/users';
import { useKeyedAsyncAction } from '@/hooks/use-async-action';
import { authClient } from '@/lib/auth-client';
import { UsersView, type NewUserInput, type UserRow } from './users-view';

/** Wires /admin/users to the trusted flag and better-auth's admin.createUser. */
function UsersContainer(props: {
  users: UserRow[];
  currentUserId: string;
  minLength: number;
  signupOpen: boolean;
}) {
  const router = useRouter();
  const { pendingKey, run } = useKeyedAsyncAction<string>();
  const [creating, setCreating] = useState(false);

  const setTrusted = (userId: string, trusted: boolean) =>
    run(userId, () => setTrustedContributor(userId, trusted), {
      success: trusted
        ? 'Marked as trusted contributor'
        : 'Trusted-contributor status removed',
      error: 'Could not change the trusted-contributor status',
    });

  async function createUser({ admin, ...input }: NewUserInput) {
    setCreating(true);
    const { error } = await authClient.admin.createUser({
      ...input,
      role: admin ? 'admin' : 'user',
    });
    setCreating(false);
    if (error) {
      toast.error(error.message ?? 'Could not create user');
      return false;
    }
    toast.success(`Account for ${input.name} created`);
    router.refresh();
    return true;
  }

  return (
    <UsersView
      {...props}
      pendingTrustedId={pendingKey}
      creating={creating}
      onTrustedChange={setTrusted}
      onCreateUser={createUser}
    />
  );
}

export { UsersContainer };
