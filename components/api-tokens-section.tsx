'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createApiToken, revokeApiToken } from '@/app/actions/api-tokens';
import { toast } from 'sonner';

type TokenRow = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export function ApiTokensSection({ tokens }: { tokens: TokenRow[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  // Plaintext of the token created in this session — shown exactly once
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const { token } = await createApiToken(name);
      setCreatedToken(token);
      setCopied(false);
      setName('');
      router.refresh();
    } catch {
      toast.error('Could not create token');
    } finally {
      setPending(false);
    }
  }

  async function revoke(id: string) {
    try {
      await revokeApiToken(id);
      toast.success('Token revoked');
      router.refresh();
    } catch {
      toast.error('Could not revoke token');
    }
  }

  async function copy() {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
    toast.success('Token copied');
  }

  return (
    <section className="border-border bg-card rounded-lg border p-6">
      <h2 className="font-semibold">API tokens</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Tokens let external clients use the REST API on your behalf. Send them
        as{' '}
        <code className="bg-muted rounded px-1 py-0.5 text-xs">
          Authorization: Bearer …
        </code>{' '}
        — see the{' '}
        <a
          href="/api-docs"
          className="hover:text-foreground underline underline-offset-2"
        >
          API documentation
        </a>
        .
      </p>

      <form onSubmit={create} className="mt-4 flex items-end gap-3 sm:max-w-sm">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="token-name">Token name</Label>
          <Input
            id="token-name"
            required
            placeholder="e.g. Scale script"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create token'}
        </Button>
      </form>

      {createdToken && (
        <div className="border-border bg-muted/50 mt-4 rounded-md border p-4">
          <p className="text-sm font-medium">
            Copy your new token now — it won't be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="bg-background min-w-0 flex-1 rounded px-2 py-1.5 font-mono text-xs break-all">
              {createdToken}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={copy}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      {tokens.length > 0 && (
        <ul className="divide-border mt-6 flex flex-col divide-y">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="text-muted-foreground text-xs">
                  <span className="font-mono">{t.tokenPrefix}…</span>
                  {' · created '}
                  {t.createdAt.toLocaleDateString()}
                  {' · '}
                  {t.lastUsedAt
                    ? `last used ${t.lastUsedAt.toLocaleDateString()}`
                    : 'never used'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => revoke(t.id)}
              >
                <Trash2 className="h-4 w-4" />
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
