'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { createApiToken, revokeApiToken } from '@/app/actions/api-tokens';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useConfirm } from '@/hooks/use-confirm';
import { authClient } from '@/lib/auth-client';
import { AccountView, type AccountToken } from './account-view';

type AccountContainerProps = {
  name: string;
  isAdmin: boolean;
  memberSince: Date;
  minLength: number;
  tokens: AccountToken[];
  /** Server time, so "12 min ago" renders the same on server and client. */
  now: Date;
};

/** Wires /account to better-auth (name, password) and the API-token actions. */
function AccountContainer(props: AccountContainerProps) {
  const router = useRouter();
  const { confirm, dialogProps } = useConfirm();
  const [pending, setPending] = useState({
    name: false,
    password: false,
    token: false,
    revoking: null as string | null,
  });
  // Plaintext of the token created in this session — shown exactly once.
  const [createdToken, setCreatedToken] = useState<{
    name: string;
    token: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const busy = (patch: Partial<typeof pending>) =>
    setPending((p) => ({ ...p, ...patch }));

  async function saveName(name: string) {
    busy({ name: true });
    const { error } = await authClient.updateUser({ name });
    busy({ name: false });
    if (error) {
      toast.error(error.message ?? 'Could not update name');
      return false;
    }
    toast.success('Display name updated');
    router.refresh();
    return true;
  }

  async function changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }) {
    busy({ password: true });
    const { error } = await authClient.changePassword({
      ...input,
      revokeOtherSessions: true,
    });
    busy({ password: false });
    if (error) {
      toast.error(error.message ?? 'Could not change password');
      return false;
    }
    toast.success('Password changed');
    return true;
  }

  async function createToken(name: string) {
    busy({ token: true });
    try {
      const { token } = await createApiToken(name);
      setCreatedToken({ name, token });
      setCopied(false);
      router.refresh();
      return true;
    } catch {
      toast.error('Could not create token');
      return false;
    } finally {
      busy({ token: false });
    }
  }

  async function copyToken() {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken.token);
      setCopied(true);
      toast.success('Token copied');
    } catch {
      toast.error('Could not copy — select the token and copy it by hand');
    }
  }

  async function revokeToken(token: AccountToken) {
    const ok = await confirm({
      title: `Revoke "${token.name}"?`,
      description:
        'Clients using this token stop working right away. Not reversible.',
      confirmLabel: 'Revoke',
      destructive: true,
    });
    if (!ok) return;
    busy({ revoking: token.id });
    try {
      await revokeApiToken(token.id);
      toast.success('Token revoked');
      router.refresh();
    } catch {
      toast.error('Could not revoke token');
    } finally {
      busy({ revoking: null });
    }
  }

  return (
    <>
      <AccountView
        {...props}
        createdToken={createdToken}
        copied={copied}
        pending={pending}
        onSaveName={saveName}
        onChangePassword={changePassword}
        onCreateToken={createToken}
        onCopyToken={copyToken}
        onRevokeToken={revokeToken}
      />
      <ConfirmDialog {...dialogProps} />
    </>
  );
}

export { AccountContainer };
