'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckIcon, CopyIcon } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { PasswordField } from '@/components/common/password-field';
import { ResultBox } from '@/components/common/result-box';
import { SectionHeader } from '@/components/common/section-header';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fullDate, monthYear } from '@/lib/dates';
import { formatAgoShort } from '@/lib/relative-time';

export type AccountToken = {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

type AccountViewProps = {
  name: string;
  isAdmin: boolean;
  memberSince: Date;
  /** `passwordMinLength` from lib/auth.ts, passed down by the server. */
  minLength: number;
  tokens: AccountToken[];
  /** The token just created: its plaintext is shown this once. */
  createdToken: { name: string; token: string } | null;
  copied?: boolean;
  now: Date;
  pending?: {
    name?: boolean;
    password?: boolean;
    token?: boolean;
    /** Id of the token being revoked. */
    revoking?: string | null;
  };
  /** Each resolves true on success, so the form can clear itself. */
  onSaveName: (name: string) => Promise<boolean>;
  onChangePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<boolean>;
  onCreateToken: (name: string) => Promise<boolean>;
  onCopyToken: () => void;
  onRevokeToken: (token: AccountToken) => void;
};

function Section({
  index,
  title,
  aside,
  children,
}: {
  index: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="min-w-0">
      <SectionHeader id={id} index={index} title={title} aside={aside} />
      {children}
    </section>
  );
}

/** `/account` (Account board): display name, password, API tokens. */
function AccountView({
  name: initialName,
  isAdmin,
  memberSince,
  minLength,
  tokens,
  createdToken,
  copied,
  now,
  pending = {},
  onSaveName,
  onChangePassword,
  onCreateToken,
  onCopyToken,
  onRevokeToken,
}: AccountViewProps) {
  const [name, setName] = React.useState(initialName);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [repeat, setRepeat] = React.useState('');
  const [mismatch, setMismatch] = React.useState(false);
  const [tokenName, setTokenName] = React.useState('');

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    await onSaveName(name.trim());
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== repeat) {
      setMismatch(true);
      return;
    }
    const ok = await onChangePassword({ currentPassword, newPassword });
    if (ok) {
      setCurrentPassword('');
      setNewPassword('');
      setRepeat('');
    }
  }

  async function createToken(e: React.FormEvent) {
    e.preventDefault();
    if (await onCreateToken(tokenName.trim())) setTokenName('');
  }

  return (
    <div data-slot="account-view" className="flex flex-col gap-9">
      <PageHeader
        kicker="Account"
        meta={`${isAdmin ? 'Admin' : 'Member'} · member since ${monthYear(memberSince)}`}
        title="Account"
      />

      {/* Account board: 01 | 02 side by side, API tokens full width below. */}
      <div className="grid items-start gap-x-12 gap-y-9 lg:grid-cols-2">
        <Section index="01" title="Display name">
          <form onSubmit={saveName}>
            <Field>
              <FieldLabel>Display name</FieldLabel>
              <div className="flex gap-2">
                <Input
                  variant="ink"
                  autoComplete="name"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={pending.name || name.trim() === initialName}
                >
                  {pending.name ? 'Saving…' : 'Save name'}
                </Button>
              </div>
              <FieldDescription>
                Shown to members of your groups.
              </FieldDescription>
            </Field>
          </form>
        </Section>

        <Section index="02" title="Change password">
          <form onSubmit={changePassword} className="flex flex-col gap-4">
            <PasswordField
              label="Current password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
            <PasswordField
              label="New password"
              autoComplete="new-password"
              minLength={minLength}
              value={newPassword}
              onChange={(v) => {
                setNewPassword(v);
                setMismatch(false);
              }}
              description="Other sessions are signed out after the change."
            />
            <PasswordField
              label="Repeat new password"
              autoComplete="new-password"
              minLength={minLength}
              value={repeat}
              onChange={(v) => {
                setRepeat(v);
                setMismatch(false);
              }}
              error={mismatch ? "Passwords don't match." : null}
            />
            <Button
              type="submit"
              className="self-start"
              disabled={pending.password}
            >
              {pending.password ? 'Changing…' : 'Change password'}
            </Button>
          </form>
        </Section>
      </div>

      <Section
        index="03"
        title="API tokens"
        aside={<Link href="/api-docs">API docs →</Link>}
      >
        <div className="flex flex-col gap-5">
          <p className="text-muted-foreground text-sm">
            Let external scales or scripts read your inventory and post
            weighings. A token acts as you — keep it secret, revoke it when a
            device is gone.
          </p>
          <form onSubmit={createToken} className="flex items-end gap-2">
            <Field className="flex-1">
              <FieldLabel>Token name</FieldLabel>
              <Input
                variant="ink"
                required
                placeholder="e.g. Scale script"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={pending.token}>
              {pending.token ? 'Creating…' : 'Create token'}
            </Button>
          </form>

          {createdToken && (
            <ResultBox
              role="status"
              data-slot="token-reveal"
              className="flex-col items-stretch gap-2"
            >
              <span className="kicker">New · {createdToken.name}</span>
              <div className="flex items-center gap-2">
                <code className="bg-muted min-w-0 flex-1 rounded-[3px] px-2 py-1.5 font-mono text-xs break-all">
                  {createdToken.token}
                </code>
                <Button type="button" size="sm" onClick={onCopyToken}>
                  {copied ? (
                    <CheckIcon aria-hidden />
                  ) : (
                    <CopyIcon aria-hidden />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <span className="fine text-muted-foreground">
                Copy it now — this token won&apos;t be shown again.
              </span>
            </ResultBox>
          )}

          {tokens.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tokens yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Name</TableHead>
                    <TableHead scope="col">Created</TableHead>
                    <TableHead scope="col">Last used</TableHead>
                    <TableHead scope="col">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {fullDate(t.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {t.lastUsedAt
                          ? formatAgoShort(t.lastUsedAt, now)
                          : 'never'}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Revoke ${t.name}`}
                          disabled={pending.revoking === t.id}
                          onClick={() => onRevokeToken(t)}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

export { AccountView };
