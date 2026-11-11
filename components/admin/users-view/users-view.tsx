'use client';

import * as React from 'react';

import { PageHeader } from '@/components/common/page-header';
import { PasswordField } from '@/components/common/password-field';
import { SectionHeader } from '@/components/common/section-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** Same shape as `AdminUserRow` (app/actions/users.ts). */
export type UserRow = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  trustedContributor: boolean;
  spoolCount: number;
};

export type NewUserInput = {
  name: string;
  email: string;
  password: string;
  admin: boolean;
};

type UsersViewProps = {
  users: UserRow[];
  /** Marks the viewer's own row "you". */
  currentUserId: string;
  /** `passwordMinLength` from lib/auth.ts. */
  minLength: number;
  /** ALLOW_SIGNUP: the description then mentions open registration. */
  signupOpen: boolean;
  /** Id of the user whose trusted flag is being saved. */
  pendingTrustedId?: string | null;
  creating?: boolean;
  onTrustedChange: (userId: string, trusted: boolean) => void;
  /** Resolves true when the account was created, so the form can clear. */
  onCreateUser: (input: NewUserInput) => Promise<boolean>;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** `/admin/users` (AdminUsers board): accounts table + create-user panel. */
function UsersView({
  users,
  currentUserId,
  minLength,
  signupOpen,
  pendingTrustedId,
  creating,
  onTrustedChange,
  onCreateUser,
}: UsersViewProps) {
  const accountsId = React.useId();
  const createId = React.useId();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [admin, setAdmin] = React.useState(false);

  const admins = users.filter((u) => u.isAdmin).length;
  const trusted = users.filter(
    (u) => !u.isAdmin && u.trustedContributor
  ).length;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const ok = await onCreateUser({
      name: name.trim(),
      email: email.trim(),
      password,
      admin,
    });
    if (ok) {
      setName('');
      setEmail('');
      setPassword('');
      setAdmin(false);
    }
  }

  return (
    <div data-slot="users-view" className="flex flex-col gap-9">
      <PageHeader
        index="A1"
        breadcrumb={[{ label: 'Admin' }, { label: 'Users' }]}
        meta={[
          plural(users.length, 'account'),
          plural(admins, 'admin'),
          `${trusted} trusted`,
        ].join(' · ')}
        title="Users"
        description={
          signupOpen
            ? 'Registration is open — anyone can sign up. You can also create accounts here.'
            : 'Registration is closed — accounts are created here. Share the temporary password, or tell the new member to use “Forgot password” with their email.'
        }
      />

      <div className="grid items-start gap-10 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby={accountsId} className="min-w-0">
          <SectionHeader id={accountsId} index="01" title="Accounts" />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Name</TableHead>
                  <TableHead scope="col">Email</TableHead>
                  <TableHead scope="col">Role</TableHead>
                  <TableHead scope="col">Trusted contributor</TableHead>
                  <TableHead scope="col" align="right">
                    Spools
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {u.name}
                      {u.id === currentUserId && (
                        <Badge variant="muted" className="ml-2">
                          you
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      {u.isAdmin ? (
                        <Badge variant="inverted">Admin</Badge>
                      ) : (
                        <Badge>Member</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.isAdmin ? (
                        <span className="kicker">implied</span>
                      ) : (
                        <Switch
                          aria-label={`Trusted contributor: ${u.name}`}
                          checked={u.trustedContributor}
                          disabled={pendingTrustedId === u.id}
                          onCheckedChange={(next) =>
                            onTrustedChange(u.id, next)
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell align="right" className="tabular font-mono">
                      {u.spoolCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Trusted contributors add catalog entries already approved — no
            review needed.
          </p>
        </section>

        <section
          aria-labelledby={createId}
          className="border-ink bg-card w-full max-w-[480px] min-w-0 rounded-[8px] border p-5"
        >
          <h2 id={createId} className="display-section mb-4">
            Create user
          </h2>
          <form onSubmit={create} className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                required
                minLength={2}
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <PasswordField
              label="Temporary password"
              type="text"
              autoComplete="off"
              minLength={minLength}
              value={password}
              onChange={setPassword}
              description={`At least ${minLength} characters. They can change it under Account.`}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={admin} onCheckedChange={setAdmin} />
              Grant admin role
            </label>
            <Button type="submit" className="self-start" disabled={creating}>
              {creating ? 'Creating…' : 'Create user'}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}

export { UsersView };
