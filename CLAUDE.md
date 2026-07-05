# Spoolhouse — Filament Warehouse

Inventory manager for 3D-printer filament spools, exported from a Vercel V0 prototype.

**Core concept:** instead of tracking filament usage per print, you periodically re-weigh the whole spool on a scale. Remaining filament = measured total weight − the empty-spool weight of the filament's **spool type** (a global, admin-curated catalog).

## Commands

```sh
npm run dev          # start dev server (next dev)
npm run build        # production build
npm run start        # serve production build
npm run db:generate  # drizzle-kit: generate migration from schema changes
npm run db:migrate   # drizzle-kit: apply migrations manually (usually unnecessary, see below)
npm run db:studio    # drizzle-kit: local DB browser
npm run admin:create -- <email> <name>   # bootstrap/promote an admin account
```

Package manager is **npm** (`package-lock.json`).

## Auth

**better-auth** (email + password, Drizzle/SQLite adapter, admin plugin). Key points:

- **Registration is closed by default**, toggleable via `ALLOW_SIGNUP=true` (gates the better-auth API via `disableSignUp`, the `/signup` page, and the sign-up link on `/login` — see `signupAllowed` in `lib/auth.ts`; env changes need a server restart). Regardless of the flag, admins create accounts on `/admin/users`, and the first admin is bootstrapped with `npm run admin:create -- <email> <name>` (`scripts/create-admin.ts`; also promotes an existing user to admin).
- **Session checks:** `proxy.ts` does only an optimistic cookie-presence redirect to `/login`. The authoritative check is `requireUser()` / `requireAdmin()` from `lib/auth-session.ts` — **call one of these at the top of every protected page and every server action.** Ownership is enforced in SQL (`where userId = user.id`), never by trusting client-provided ids.
- Auth tables live in `lib/db/auth-schema.ts` (generated via `npx @better-auth/cli generate`, re-exported from `lib/db/schema.ts`). `filaments.userId` FKs to `user.id` with cascade delete.
- Client-side calls go through `authClient` (`lib/auth-client.ts`): sign-in/out, `changePassword`, `requestPasswordReset`/`resetPassword`, `admin.createUser`.
- Password-reset mails: `lib/mail.ts` — SMTP when `SMTP_HOST` is set, otherwise logged to the server console (dev fallback).
- Required env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (see `.env.example`).
- Pages: `/login`, `/signup` (only when `ALLOW_SIGNUP=true`), `/forgot-password`, `/reset-password`, `/account` (display name + change password), `/spool-types` (catalog + request), `/admin/users` + `/admin/spool-types` (admin only).
- Password min length: `MINIMUM_PASSWORD_LENGTH` env (default 12) — exported as `passwordMinLength` from `lib/auth.ts` and passed to client forms **as a prop from server components** (plain `process.env` reads are undefined in the browser).

## Database setup

None required. The app uses a **SQLite file** (`data/spoolhouse.db` by default, override with the optional `DATABASE_PATH` env var — see `.env.example`). On startup, `lib/db/index.ts` creates the `data/` directory, opens the DB in WAL mode, and **auto-applies migrations from `drizzle/`** — so a fresh checkout works with just `npm install && npm run dev`.

Schema changes: edit `lib/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`; the app applies it on next start.

Backups: copy `data/spoolhouse.db`. Target deployment is a single self-hosted Linux box (Hetzner); if the app ever needs a client-server DB, Drizzle's query API is dialect-agnostic — swap the schema back to `pgTable` + the `pg` driver and move the data.

## Tech stack

- **Next.js 16.2.6** (App Router) with **React 19**, server components + server actions
- **TypeScript** (strict, path alias `@/*` → repo root) — but `next.config.mjs` sets `typescript.ignoreBuildErrors: true`
- **Tailwind CSS v4** — CSS-first config in `app/globals.css` (`@theme inline`, oklch tokens); there is no `tailwind.config.*`
- **shadcn/ui** (style `base-nova`) built on **Base UI** (`@base-ui/react`), not Radix — primitives live in `components/ui/`
- **Drizzle ORM + better-sqlite3** for data access (SQLite file, migrations via drizzle-kit)
- **better-auth** for authentication (see Auth section)
- `lucide-react` icons, `sonner` toasts
- **Theming:** `next-themes` (`components/theme-provider.tsx`, wrapped in `app/layout.tsx`, default = system, class strategy). Light/dark/system switch lives in the user menu. All colors come from the oklch tokens in `app/globals.css` (`:root` + `.dark`) — petrol/blue accent (hue ~205–210), cool neutrals; never hardcode colors in components

## Architecture

Main route `/`:

```
app/page.tsx (server component, force-dynamic)
  └─ getFilaments() → toFilamentView() per row, merged with active-lend borrower names
  └─ <WarehouseDashboard>  (client)
       ├─ stat tiles, tabs: In stock / Empty / All
       ├─ <SpoolCard> per spool  — status badge, "Lent to X" badge, progress bar, inline re-weigh flow, edit/delete menu
       └─ <SpoolFormDialog>      — create/edit form with live "filament left" preview
```

Mutations go through server actions in `app/actions/filaments.ts` (`createFilament`, `updateFilament`, `setMeasuredWeight`, `deleteFilament`), each calling `revalidatePath("/")` to refresh the page data. No global state library — server is the source of truth, `useState` for UI-local state only.

**Groups, sharing & lending** (`/groups`, `/groups/[id]`, `/groups/join/[code]`): invite-only groups
pool members' (selectively) shared spools into a browsable group stock; members request to borrow,
the owner approves/declines, and marks it returned when it's physically back. See "Groups & lending"
below for the data model and authorization rules.

### Key files

| File | Purpose |
|---|---|
| `lib/filament.ts` | Domain logic: gram math, thresholds, `FilamentView` (incl. `lentToName`), `toFilamentView(filament, spoolType)`, `formatWeight`, `spoolTypeLabel`, `FILAMENT_TYPES` |
| `app/actions/spool-types.ts` | Spool-type catalog actions: usable/catalog queries, request, admin approve/reject |
| `lib/db/schema.ts` | Drizzle tables (`filaments`, `spoolTypes`, `groups`, `groupMembers`, `filamentShareOverrides`, `lends`) + inferred types (re-exports auth schema) |
| `lib/auth.ts` / `lib/auth-client.ts` | better-auth server instance / React client |
| `lib/auth-session.ts` | `requireUser()` / `requireAdmin()` — mandatory in protected pages & actions |
| `proxy.ts` | Optimistic login redirect (cookie presence only) |
| `lib/db/index.ts` | better-sqlite3 + drizzle client singleton, auto-runs migrations on startup |
| `drizzle.config.ts` / `drizzle/` | drizzle-kit config and committed SQL migrations |
| `app/actions/filaments.ts` | Filament server actions (CRUD + re-weigh) |
| `lib/sharing.ts` | `getSharedFilaments(groupId)` — single source of truth resolving each member's share mode into the group's pooled stock; `getMembership(groupId, userId)` |
| `app/actions/groups.ts` | Group CRUD, membership, invite codes, `updateShareSettings` |
| `app/actions/lends.ts` | Lend lifecycle: `requestLend`, `approveLend`, `declineLend`, `markReturned`, `getGroupLends`, `getActiveLendsForOwner` |
| `components/warehouse-dashboard.tsx` | Main client UI: stats, filters, dialog state |
| `components/spool-card.tsx` | Spool display + inline re-weigh + "Lent to X" badge |
| `components/spool-form-dialog.tsx` | Create/edit form |
| `components/group-stock.tsx` / `group-lend-requests.tsx` / `group-lend-history.tsx` / `group-sharing-settings.tsx` / `group-owner-tools.tsx` | `/groups/[id]` page sections |
| `lib/api-auth.ts` | REST-API token auth: `generateApiToken`, `authenticateApiRequest(request)`, `apiError`/`unauthorized` helpers |
| `lib/spool-type-usable.ts` | `isSpoolTypeUsable`/`assertSpoolTypeUsable` — shared by server actions and REST API |
| `app/actions/api-tokens.ts` | API-token management actions (create/list/revoke) backing the `/account` section |
| `app/api/v1/` | REST route handlers (see "REST API" below); `filaments/shared.ts` holds serialization + body validation |
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge) |

## Domain rules

- **All weights are gram integers** (`emptyWeightGrams`, `fullFilamentWeightGrams`, `measuredTotalWeightGrams`); display via `formatWeight()` (g below 1 kg, kg above); timestamps are `integer` unix-epoch columns surfaced as `Date` objects (Drizzle `mode: "timestamp"`)
- Remaining filament: `filamentLeftGrams = measuredTotalWeightGrams − spoolType.emptyWeightGrams` (clamped ≥ 0)
- **Empty** when `filamentLeftGrams ≤ 5`; **Low** when `percentLeft ≤ 15%`
- **Spool types** (`spool_types` table): global catalog with `status` `approved | pending | rejected`. Any user can request one (`requestSpoolType`); it's **immediately usable by its submitter** but visible to others only after admin approval (`/admin/spool-types`). Filaments reference `spoolTypeId` (no cascade); a later rejection never breaks existing filaments. The usable-by-user rule lives in `assertSpoolTypeUsable` / `getUsableSpoolTypes`.
- Filament types: PLA, PETG, ABS, ASA, TPU, Nylon, PC, PVA, HIPS, Other (`FILAMENT_TYPES` in `lib/filament.ts`)

## Groups & lending

- **Groups** (`groups` table) have one owner and a single reusable, rotatable **invite code**
  (Discord-style — join via code entry on `/groups` or the `/groups/join/[code]` link). Rotating
  invalidates the old code/link immediately.
- **Membership** (`group_members`): `role` is `owner | member`; `shareMode` is `all | whitelist |
  blacklist`, defaulting to `all` on join. `filament_share_overrides` holds the per-member override
  list, whose meaning flips with the mode — whitelist entries **are** shared, blacklist entries are
  **excluded**. `getSharedFilaments(groupId)` in `lib/sharing.ts` is the single place that resolves
  this into the pooled group stock (also excludes empty spools); reuse it rather than
  re-implementing the mode logic elsewhere (e.g. future search/filter work).
- **Lending** (`lends` table): a request (`status='requested'`) is created by a member on a spool
  they don't own that's actually shared in that group; the filament owner approves (→ `active`) or
  declines. Only the **owner** marks a lend `returned` — no two-step confirmation from the borrower.
  At most one `requested`/`active` lend per filament is enforced at request time in
  `app/actions/lends.ts`. Lending never blocks the owner's own re-weigh/edit actions.
- **Authorization**: every group/lend action starts with `requireUser()`; membership/ownership is
  always re-checked in the SQL `WHERE`, never inferred from client-provided ids — same discipline as
  the rest of the app.

## REST API (`/api/v1`)

External clients authenticate with long-lived bearer tokens created on `/account`
(**API tokens** section). Endpoint reference: `docs/api.md`; interactive Swagger UI at
`/api-docs` (login-protected), backed by the OpenAPI spec in `lib/openapi.ts` served at
`GET /api/v1/openapi.json` (public, no auth — docs only).

- Tokens: `sph_` + 32 random bytes base64url, stored **SHA-256-hashed** in `api_tokens`
  (plaintext shown once at creation; revoke = row delete). `authenticateApiRequest(request)`
  in `lib/api-auth.ts` resolves `Authorization: Bearer …` to the owning user and touches
  `lastUsedAt` — call it first in every `/api/v1` route handler (the API-route counterpart
  of `requireUser()`; ownership still enforced in SQL `WHERE`).
- Endpoints: `GET /me`, `GET /spool-types` (usable ones), `GET|POST /filaments`,
  `GET|PATCH|DELETE /filaments/:id`, `PUT /filaments/:id/weight` (re-weigh). Mutations call
  `revalidatePath("/")`. Errors: `{"error":{"code","message"}}` with 400/401/404.
- `proxy.ts` exempts all of `/api/` from the login redirect; API auth happens in the
  handlers. Groups/lending are not exposed in v1.
- **Keep `lib/openapi.ts` and `docs/api.md` in sync when endpoints change.**

## Known gaps / quirks (V0 export leftovers)

- No README, no seed data (fresh DB shows the empty state; spool-type catalog starts empty too)
- `npm run lint` references eslint, but eslint is not in `devDependencies`
- Unused V0 placeholder assets in `public/` (`placeholder*.{svg,jpg,png}`)

## Working notes

Session-local plans and current working steps live in `.claude/workind-notes.md` (git-ignored).
