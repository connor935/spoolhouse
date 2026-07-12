'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

export function CreateUserForm({ minLength }: { minLength: number }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [admin, setAdmin] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const { error } = await authClient.admin.createUser({
      name: name.trim(),
      email: email.trim(),
      password,
      role: admin ? 'admin' : 'user',
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? 'Could not create user');
      return;
    }
    toast.success(`Account for ${name.trim()} created`);
    setName('');
    setEmail('');
    setPassword('');
    setAdmin(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4 sm:max-w-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-user-name">Name</Label>
        <Input
          id="new-user-name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-user-email">Email</Label>
        <Input
          id="new-user-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-user-password">Temporary password</Label>
        <Input
          id="new-user-password"
          type="text"
          required
          minLength={minLength}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={admin}
          onChange={(e) => setAdmin(e.target.checked)}
          className="h-4 w-4 accent-current"
        />
        Grant admin role
      </label>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? 'Creating…' : 'Create user'}
      </Button>
    </form>
  );
}
