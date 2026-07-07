# Spoolhouse — Filament Warehouse

Inventory manager for 3D-printer filament spools, exported from a Vercel V0 prototype.

**Core concept:** a global **material** ("Prusament — Galaxy Black, PLA") is referenced by many users' physical **spools**. Instead of tracking usage per print, you periodically re-weigh a spool on a scale: remaining filament = measured total weight − the empty-spool weight of its **spool type**. Materials AND spool types are global, admin-curated catalogs with a request→review workflow.

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
- Pages: `/login`, `/signup` (only when `ALLOW_SIGNUP=true`), `/forgot-password`, `/reset-password`, `/account`, `/materials` + `/spool-types` (catalogs + request), `/admin/users` + `/admin/materials` + `/admin/spool-types` (admin only).
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
  └─ getInventory() → groupInventory() (spools grouped by material, merged with active-lend borrowers)
  └─ <WarehouseDashboard>  (client)
       ├─ <AppHeader> (bell + user menu), <FilamentStats>
       ├─ tabs: In stock / Empty / All / Borrows / one per group
       ├─ <MaterialCard> per material — aggregate line, per-spool rows (re-weigh, edit/delete, lent badge), add-spool
       └─ <SpoolFormDialog>  — material + spool-type pickers (inline request flows), weights, live preview
```

Mutations go through server actions in `app/actions/filaments.ts` (`createSpool`, `updateSpool`, `setMeasuredWeight`, `deleteSpool`), each calling `revalidatePath("/")` to refresh the page data. No global state library — server is the source of truth, `useState` for UI-local state only.

**Groups, sharing & lending**: invite-only groups pool members' (selectively) shared spools.
The dashboard is the primary surface — **one tab per group** (browse + request via `GroupStock`)
and a **"Borrows" tab** (`components/borrows-panel.tsx`, fed by `getMyLends()`) showing all lends
across groups: incoming requests (approve/decline), own requests (cancel), lent out (mark returned),
borrowed, history. `/groups` + `/groups/[id]` are **management only** (membership, sharing settings,
owner tools — no stock/lend UI there). Pending requests are visible on stock cards
("Requested — awaiting approval" for the requester, who can cancel; "Requested by X" for the owner).

**In-app notifications**: lend lifecycle events write rows to the `notifications` table
(`lib/notifications.ts` helper, called from `app/actions/lends.ts`; names are denormalized snapshots).
Bell with unread count in the dashboard header and in every `PageShell`; `/notifications` lists them
and marks all read on open. **Borrow-request notifications are actionable**: `getNotifications`
joins the lend's current status, and clicking such a row opens an approve/decline dialog
(`components/notifications-list.tsx`). No polling — counts refresh per page load.

**Sub-page layout**: every page except the dashboard and `/groups/join/[code]` renders inside
`components/page-shell.tsx` (`max-w-3xl` container, back-link, title). The notification bell lives
in `components/app-header.tsx`. **Never hand-roll a `<main>` wrapper on sub-pages — use PageShell.**

### Key files

| File | Purpose |
|---|---|
| `lib/filament.ts` | Domain logic: gram math, thresholds, `SpoolView`, `MaterialInventory`, `toSpoolView`, `groupInventory`, `formatWeight`, `materialLabel`, `spoolTypeLabel`, `FILAMENT_TYPES` |
| `app/actions/spool-types.ts` / `app/actions/materials.ts` | Catalog actions (usable/catalog queries, request, admin approve/reject) — same pattern for both |
| `lib/db/schema.ts` | Drizzle tables (`materials`, `spools` [DB: "filaments"], `spoolTypes`, `groups`, `groupMembers`, `filamentShareOverrides` [material-level], `lends`, `notifications`) + inferred types (re-exports auth schema) |
| `components/page-shell.tsx` | Shared sub-page layout (width, back-link, title, bell) — use on every sub-page |
| `lib/notifications.ts` / `app/actions/notifications.ts` | Notification writer helper / read actions (`getUnreadCount`, `getNotifications`, `markAllRead`) |
| `lib/auth.ts` / `lib/auth-client.ts` | better-auth server instance / React client |
| `lib/auth-session.ts` | `requireUser()` / `requireAdmin()` — mandatory in protected pages & actions |
| `proxy.ts` | Optimistic login redirect (cookie presence only) |
| `lib/db/index.ts` | better-sqlite3 + drizzle client singleton, auto-runs migrations on startup |
| `drizzle.config.ts` / `drizzle/` | drizzle-kit config and committed SQL migrations |
| `app/actions/filaments.ts` | Spool server actions: `getInventory`, `createSpool`/`updateSpool` (usable-material/type checks), `setMeasuredWeight` (owner or active borrower), `deleteSpool` |
| `lib/sharing.ts` | `getSharedFilaments(groupId)` — single source of truth resolving each member's share mode into the group's pooled stock; `getMembership(groupId, userId)` |
| `app/actions/groups.ts` | Group CRUD, membership, invite codes, `updateShareSettings` |
| `app/actions/lends.ts` | Lend lifecycle: `requestLend`, `approveLend`, `declineLend`, `markReturned`, `cancelLendRequest`, `getMyLends` (cross-group, feeds Borrows tab), `getActiveLendsForOwner` — mutations write notifications |
| `components/borrows-panel.tsx` / `notifications-list.tsx` | Dashboard Borrows tab / actionable notification list with approve-decline dialog |
| `components/warehouse-dashboard.tsx` | Main client UI: stats, tabs (incl. Borrows + per-group), dialog state |
| `components/material-card.tsx` | Material card with per-spool rows (re-weigh, edit/delete, lent badge) + add-spool |
| `components/spool-form-dialog.tsx` | Add/edit spool: material + spool-type pickers with inline request flows |
| `components/group-stock.tsx` / `group-lend-requests.tsx` / `group-lend-history.tsx` / `group-sharing-settings.tsx` / `group-owner-tools.tsx` | `/groups/[id]` page sections |
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge) |

## Domain rules

- **All weights are gram integers** (`emptyWeightGrams`, `fullFilamentWeightGrams`, `measuredTotalWeightGrams`); display via `formatWeight()` (g below 1 kg, kg above); timestamps are `integer` unix-epoch columns surfaced as `Date` objects (Drizzle `mode: "timestamp"`)
- Remaining filament: `filamentLeftGrams = measuredTotalWeightGrams − spoolType.emptyWeightGrams` (clamped ≥ 0)
- Re-weigh (`setMeasuredWeight`) is allowed for the **owner and the current borrower** (active lend) — the borrower re-weighs from the Borrows tab ("Borrowed by you" section)
- **Empty** when `filamentLeftGrams ≤ 5`; **Low** when `percentLeft ≤ 15%`
- **Materials & spool types** are both global catalogs with `status` `approved | pending | rejected` and identical request→review workflows (`requestMaterial`/`requestSpoolType`; review on `/admin/materials` + `/admin/spool-types`): a pending entry is **immediately usable by its submitter**, visible to others only after approval; rejection never breaks existing references. Usable-rules: `assertMaterialUsable`/`assertSpoolTypeUsable` + `getUsableMaterials`/`getUsableSpoolTypes`.
- **Spools** (DB table still named `filaments`, TS export `spools` — deliberate, avoids SQLite rename migrations): a physical spool references `materialId` + `spoolTypeId` + weights. The dashboard groups spools by material (`groupInventory`); adding another spool of the same material is one click on the material card.
- **Sharing is material-level**: a member's whitelist/blacklist overrides reference material ids (all their spools of it, incl. future ones). Lending stays per physical spool. Group stock is grouped by material across owners.
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

## Known gaps / quirks (V0 export leftovers)

- No README, no seed data (fresh DB shows the empty state; spool-type catalog starts empty too)
- `npm run lint` references eslint, but eslint is not in `devDependencies`
- Unused V0 placeholder assets in `public/` (`placeholder*.{svg,jpg,png}`)

## Working notes

Session-local plans and current working steps live in `.claude/workind-notes.md` (git-ignored).
