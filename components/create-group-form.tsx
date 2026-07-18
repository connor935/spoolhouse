'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGroup } from '@/app/actions/groups';
import { toast } from 'sonner';

export function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Group name is required');
      return;
    }
    setPending(true);
    try {
      const group = await createGroup(name.trim());
      toast.success('Group created');
      router.push(`/groups/${group.id}`);
    } catch {
      toast.error('Could not create group');
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex items-end gap-2 sm:max-w-sm">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="group-name">Group name</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Print Farm Friends"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create'}
      </Button>
    </form>
  );
}
