'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { setTrustedContributor } from '@/app/actions/users';
import { useKeyedAsyncAction } from '@/hooks/use-async-action';

// Admin control on /admin/users: a trusted contributor's material and
// spool-type submissions auto-approve (like an admin's). Hidden for admin rows
// by the caller (admins already auto-approve).
export function TrustedContributorToggle({
  userId,
  trusted,
}: {
  userId: string;
  trusted: boolean;
}) {
  const { pendingKey, run } = useKeyedAsyncAction<string>();
  const pending = pendingKey === userId;

  return (
    <div className="flex items-center gap-2">
      {trusted && <Badge variant="secondary">Trusted</Badge>}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          run(userId, () => setTrustedContributor(userId, !trusted), {
            success: trusted
              ? 'Trusted-contributor status removed'
              : 'Marked as trusted contributor',
          })
        }
      >
        {trusted ? 'Revoke trust' : 'Trust'}
      </Button>
    </div>
  );
}
