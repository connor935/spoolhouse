'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { joinGroup } from '@/app/actions/groups';
import { toast } from 'sonner';

export function JoinByLinkButton({ code }: { code: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleJoin() {
    setPending(true);
    try {
      const group = await joinGroup(code);
      toast.success(`Joined ${group.name}`);
      router.push(`/groups/${group.id}`);
    } catch {
      toast.error('Could not join group');
      setPending(false);
    }
  }

  return (
    <Button onClick={handleJoin} disabled={pending}>
      {pending ? 'Joining…' : 'Join group'}
    </Button>
  );
}
