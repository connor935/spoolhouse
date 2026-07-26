# Spoolhouse — Filament Warehouse

Inventory manager for 3D-printer filament spools, exported from a Vercel V0 prototype.

**Core concept:** a global **material** ("Prusament — Galaxy Black, PLA") is referenced by many users' physical **spools**. Instead of tracking usage per print, you periodically re-weigh a spool on a scale: remaining filament = measured total weight − the empty-spool weight of its **spool type**. Materials AND spool types are global, admin-curated catalogs with a request→review workflow.

## Commands

```sh
npm run dev          # start dev server (+ the local database, see below)
npm run build        # production build
npm run start        # serve production build (+ the local database)
npm run db:serve     # local database only — for drizzle-kit studio / psql
npm run db:generate  # drizzle-kit: generate migration from schema changes
npm run db:migrate   # drizzle-kit: apply migrations manually (usually unnecessary, see below)
npm run db:studio    # drizzle-kit: local DB browser (needs the DB up: dev or db:serve)
npm run admin:create -- <email> <name>   # bootstrap/promote an admin account
```

Package manager is **npm** (`package-lock.json`).

## Auth

**better-auth** (email + password, Drizzle/Postgres adapter, admin plugin). Key points:

- **Registration is closed by default**, toggleable via `ALLOW_SIGNUP=true` (gates the better-auth API via `disableSignUp`, the `/signup` page, and the sign-up link on `/login` — see `signupAllowed` in `lib/auth.ts`; env changes need a server restart). Regardless of the flag, admins create accounts on `/admin/users`, and the first admin is bootstrapped with `npm run admin:create -- <email> <name>` (`scripts/create-admin.ts`; also promotes an existing user to admin).
- **Session checks:** `proxy.ts` does only an optimistic cookie-presence redirect to `/login`. The authoritative check is `requireUser()` / `requireAdmin()` from `lib/auth-session.ts` — **call one of these at the top of every protected page and every server action.** Ownership is enforced in SQL (`where userId = user.id`), never by trusting client-provided ids.
- Auth tables live in `lib/db/auth-schema.ts` (generated via `npx @better-auth/cli generate`, re-exported from `lib/db/schema.ts`). `filaments.userId` FKs to `user.id` with cascade delete.
- Client-side calls go through `authClient` (`lib/auth-client.ts`): sign-in/out, `changePassword`, `requestPasswordReset`/`resetPassword`, `admin.createUser`.
- Password-reset mails: `lib/mail.ts` — SMTP when `SMTP_HOST` is set, otherwise logged to the server console (dev fallback).
- Required env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (see `.env.example`).
- Pages: `/login`, `/signup` (only when `ALLOW_SIGNUP=true`), `/forgot-password`, `/reset-password`, `/account`, `/materials` + `/spool-types` (catalogs + request), `/admin/users` + `/admin/materials` + `/admin/spool-types` + `/admin/properties` + `/admin/import` (admin only).
- Password min length: `MINIMUM_PASSWORD_LENGTH` env (default 12) — exported as `passwordMinLength` from `lib/auth.ts` and passed to client forms **as a prop from server components** (plain `process.env` reads are undefined in the browser).

## Database setup

**PostgreSQL everywhere, one driver** (`pg` / node-postgres). `DATABASE_URL` decides which
server:

- **Production**: a real PostgreSQL server — set `DATABASE_URL` (see `.env.example`).
- **Local dev**: leave `DATABASE_URL` unset and `npm run dev` starts **PGlite** for you —
  Postgres compiled to WASM, no server to install, cluster in `data/pglite` (override with
  `DATABASE_PATH`). Still just `npm install && npm run dev` on a fresh checkout.

Dev and prod therefore run identical SQL through identical client code; there is no SQLite
and no second dialect anywhere.

**The local database is a host process, not an in-process library** — `scripts/pglite-server.mjs`
owns the data directory and speaks the Postgres wire protocol on `127.0.0.1:5433`
(`DEV_DB_PORT`). This is not optional: PGlite is a single Postgres over a data directory, and
`next dev` alone runs app code in **two** processes (the server plus a route worker for
`/api/*`). Opening the directory from several processes gives each an isolated, mutually
corrupting view — writes from a CLI script were silently invisible to the running dev server
before this was fixed. So everything connects as a client instead:

- `npm run dev` / `npm run start` wrap the Next command in `scripts/with-local-db.mjs`, which
  starts the host first (skipped when `DATABASE_URL` is set, or when the port is already
  served).
- The `tsx` CLI scripts call `withLocalDb()` (`scripts/local-db.mjs`): they reuse a running
  host, or start a private one and stop it again — so they work standalone **and** alongside
  `npm run dev`.
- `npm run db:serve` runs the host alone, e.g. for `npm run db:studio` or psql.

Migrations from `drizzle/` are applied by `runMigrations()` (`lib/db/index.ts`) — from
`instrumentation.ts` before the server serves requests, and at the start of every CLI script.
Schema changes: edit `lib/db/schema.ts`, run `npm run db:generate`, commit the new file in
`drizzle/`; it is applied on next start. Hand-written data migrations go through
`drizzle-kit generate --custom` so the journal and snapshots stay consistent (see
`drizzle/0001_seed_property_definitions.sql`, which seeds the four datasheet property
definitions the SpoolmanDB importer requires).

Backups: `pg_dump` in production; copy `data/pglite` locally.

**Deployment** (single self-hosted Hetzner box, compose stacks in a separate `server` repo):
Spoolhouse talks to the shared `postgres` stack over the external `dbnet` network. Its
password is a **Docker secret** — a file, not an env var — so instead of `DATABASE_URL` the
compose file sets `DATABASE_PASSWORD_FILE` and `databaseUrl()` (`lib/db/local.mjs`) builds the
connection string from it (host/port/user/db default to `postgres:5432` / `spoolhouse` /
`spoolhouse`, overridable via `DATABASE_HOST`/`DATABASE_PORT`/`DATABASE_USER`/`DATABASE_NAME`).
One password file is shared with the postgres container's initdb script, so it is never
duplicated. The deploy workflow's pre-start `scripts/migrate.mjs` step uses the same
resolution.

## Tech stack

- **Next.js 16.2.6** (App Router) with **React 19**, server components + server actions
- **TypeScript** (strict, path alias `@/*` → repo root) — but `next.config.mjs` sets `typescript.ignoreBuildErrors: true`
- **Tailwind CSS v4** — CSS-first config in `app/globals.css` (`@theme inline`, oklch tokens); there is no `tailwind.config.*`
- **shadcn/ui** (style `base-nova`) built on **Base UI** (`@base-ui/react`), not Radix — primitives live in `components/ui/`
- **Drizzle ORM + node-postgres** for data access (PostgreSQL; PGlite locally, migrations via drizzle-kit)
- **better-auth** for authentication (see Auth section)
- `lucide-react` icons, `sonner` toasts
- **Theming:** `next-themes` (`components/layout/theme-provider.tsx`, wrapped in `app/layout.tsx`, default = system, class strategy). Light/dark/system switch lives in the user menu. All colors come from the oklch tokens in `app/globals.css` (`:root` + `.dark`) — petrol/blue accent (hue ~205–210), cool neutrals; never hardcode colors in components

## Architecture

Main route `/`:

```
app/page.tsx (server component, force-dynamic)
  └─ getInventory() → groupInventory() (spools grouped by material, merged with active-lend borrowers)
  └─ <WarehouseDashboard>  (client)
       ├─ <AppHeader> (bell + user menu), <FilamentStats>
       ├─ tabs: In stock / Empty / All / Borrows / one per group
       ├─ <InventoryFilter>  — search + type + min-remaining (+ hide-lent on group tabs);
       │    state mirrored to URL params (?tab,&q,&type,&minLeft,&hideLent) via
       │    history.replaceState, parsed server-side in app/page.tsx → shareable links
       ├─ <MaterialCard> per material — aggregate line, per-spool rows (re-weigh, edit/delete, lent badge), add-spool
       └─ <SpoolFormDialog>  — material + spool-type pickers (inline request flows), weights, live preview
```

Mutations go through server actions in `app/actions/filaments.ts` (`createSpool`, `updateSpool`, `setMeasuredWeight`, `deleteSpool`), each calling `revalidatePath("/")` to refresh the page data. No global state library — server is the source of truth, `useState` for UI-local state only.

**Groups, sharing & lending**: invite-only groups pool members' (selectively) shared spools.
The dashboard is the primary surface — **one tab per group** (browse + request via `GroupStock`)
and a **"Borrows" tab** (`components/dashboard/borrows-panel.tsx`, fed by `getMyLends()`) showing all lends
across groups: incoming requests (approve/decline), own requests (cancel), lent out (mark returned),
borrowed, history. `/groups` + `/groups/[id]` are **management only** (membership, sharing settings,
owner tools — no stock/lend UI there). Pending requests are visible on stock cards
("Requested — awaiting approval" for the requester, who can cancel; "Requested by X" for the owner).

**In-app notifications**: lend lifecycle events write rows to the `notifications` table
(`lib/notifications.ts` helper, called from `app/actions/lends.ts`; names are denormalized snapshots).
Bell with unread count in the dashboard header and in every `PageShell`; `/notifications` lists them
and marks all read on open. **Borrow-request notifications are actionable**: `getNotifications`
joins the lend's current status, and clicking such a row opens an approve/decline dialog
(`components/notifications/notifications-list.tsx`). No polling — counts refresh per page load.

**Sub-page layout**: every page except the dashboard and `/groups/join/[code]` renders inside
`components/layout/page-shell.tsx` (`max-w-3xl` container, back-link, title). The notification bell
lives in `components/layout/app-header.tsx`. **Never hand-roll a `<main>` wrapper on sub-pages — use
PageShell.**

### Component folders

`components/` is grouped by feature, one level deep (plus `dashboard/spool-form/`). All folder and
file names are kebab-case. **Put a new component in the folder of the surface that owns it; only
promote to `common/` once a second feature imports it.**

| Folder | Contents |
|---|---|
| `ui/` | shadcn/Base-UI primitives — never hand-edit for feature needs |
| `common/` | Cross-cutting widgets used by 2+ features: `confirm-dialog`, `search-input`, `select-field`, `manufacturer-name-fields`, `request-submit-button` |
| `layout/` | App chrome mounted by layouts/pages: `page-shell`, `app-header`, `user-menu`, `theme-provider`, `live-refresh` |
| `dashboard/` | The `/` surface: `warehouse-dashboard`, `material-card`, `spool-card`, `material-dialog`, `inventory-filter`, `borrows-dialog`/`borrows-panel`, + `spool-form/` (add/edit-spool dialog, fields, pickers) |
| `catalog/` | `/materials` + `/spool-types` (+ their admin twins): generic `catalog`/`catalog-row` and the material/spool-type list, row, edit-dialog and request-form pairs |
| `materials/` | Material-property UI shared by catalog **and** dashboard: `material-properties-section`, `material-property-filter` |
| `groups/` | `/groups` + `/groups/[id]` + group stock: create/join forms, `group-stock`, sharing settings, owner tools |
| `notifications/` | `notification-bell` (rendered by layout chrome) and `notifications-list` |
| `auth/` | `auth-card` shell + login/signup/reset-password forms |
| `account/` | `/account` sections: `account-forms`, `api-tokens-section` |
| `admin/` | Admin-only surfaces with no catalog equivalent: `create-user-form`, `trusted-contributor-toggle`, `property-admin-list`, `import-manufacturers` |
| `api-docs/` | `swagger-docs` (the `/api-docs` Swagger UI client wrapper) |

### Key files

| File | Purpose |
|---|---|
| `lib/filament.ts` | Domain logic: gram math, thresholds, `SpoolView`, `MaterialInventory`, `toSpoolView`, `groupInventory`, `formatWeight`, `materialLabel`, `spoolTypeLabel`, `FILAMENT_TYPES` |
| `app/actions/spool-types.ts` / `app/actions/materials.ts` | Catalog actions (usable/catalog queries, request, admin approve/reject) — same pattern for both |
| `lib/db/schema.ts` | Drizzle tables (`materials`, `spools` [DB: "filaments"], `spoolTypes`, `properties` + `materialProperties` [datasheet values], `groups`, `groupMembers`, `filamentShareOverrides` [material-level], `lends`, `notifications`) + inferred types (re-exports auth schema) |
| `components/layout/page-shell.tsx` | Shared sub-page layout (width, back-link, title, bell) — use on every sub-page |
| `lib/notifications.ts` / `app/actions/notifications.ts` | Notification writer helper / read actions (`getUnreadCount`, `getNotifications`, `markAllRead`) |
| `lib/auth.ts` / `lib/auth-client.ts` | better-auth server instance / React client |
| `lib/auth-session.ts` | `requireUser()` / `requireAdmin()` — mandatory in protected pages & actions |
| `proxy.ts` | Optimistic login redirect (cookie presence only) |
| `lib/db/index.ts` | node-postgres pool + drizzle client singleton; `runMigrations()` / `closeDb()` |
| `lib/db/local.mjs` / `scripts/pglite-server.mjs` | Local-dev DB connection details / the PGlite host process |
| `scripts/with-local-db.mjs` / `scripts/local-db.mjs` | Wrapper that boots the local DB for `dev`/`start` / `withLocalDb()` for the CLI scripts |
| `instrumentation.ts` | Applies pending migrations once, before the server serves requests |
| `drizzle.config.ts` / `drizzle/` | drizzle-kit config and committed SQL migrations |
| `app/actions/filaments.ts` | Spool server actions: `getInventory`, `createSpool`/`updateSpool` (usable-material/type checks), `setMeasuredWeight` (owner or active borrower), `deleteSpool` |
| `lib/sharing.ts` | `getSharedFilaments(groupId)` — single source of truth resolving each member's share mode into the group's pooled stock; `getMembership(groupId, userId)` |
| `app/actions/groups.ts` | Group CRUD, membership, invite codes, `updateShareSettings` |
| `app/actions/lends.ts` | Lend lifecycle: `requestLend`, `approveLend`, `declineLend`, `markReturned`, `cancelLendRequest`, `getMyLends` (cross-group, feeds Borrows tab), `getActiveLendsForOwner` — mutations write notifications |
| `components/dashboard/borrows-panel.tsx` / `notifications/notifications-list.tsx` | Dashboard Borrows tab / actionable notification list with approve-decline dialog |
| `components/dashboard/warehouse-dashboard.tsx` | Main client UI: stats, tabs (incl. Borrows + per-group), dialog state |
| `components/dashboard/material-card.tsx` | Material card with per-spool rows (re-weigh, edit/delete, lent badge) + add-spool |
| `components/dashboard/spool-form/spool-form-dialog.tsx` | Add/edit spool: material + spool-type pickers with inline request flows |
| `components/groups/group-stock.tsx` / `group-sharing-settings.tsx` / `group-owner-tools.tsx` | `/groups/[id]` page sections + the dashboard's per-group stock tab |
| `lib/api-auth.ts` | REST-API token auth: `generateApiToken`, `authenticateApiRequest(request)`, `apiError`/`unauthorized` helpers |
| `lib/spool-type-usable.ts` | `isSpoolTypeUsable`/`assertSpoolTypeUsable` — shared by server actions and REST API |
| `app/actions/api-tokens.ts` | API-token management actions (create/list/revoke) backing the `/account` section |
| `app/api/v1/` | REST route handlers (see "REST API" below); `filaments/shared.ts` holds serialization + body validation |
| `lib/material-search.ts` | SQL `WHERE` builder for the catalog: token search, manufacturer/type, property ranges |
| `lib/search.ts` | Token matching for client-side searches (`searchTokens`/`matchesTokens`/`matchRank`) |
| `lib/spoolmandb.ts` | SpoolmanDB import core (fetch, dedupe, upsert) — used by the CLI **and** `/admin/import` |
| `app/actions/spoolmandb.ts` | Admin import actions (`getUpstreamManufacturers`, `importManufacturerFromUpstream`) |
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge) |

## Domain rules

- **All app-table primary keys are random UUIDs** (`text`, `$defaultFn(() => randomUUID())` in `lib/db/schema.ts`), not sequential integers — they're exposed in the REST API (`/api/v1/spools/:id`) and URLs, so unguessable ids avoid enumeration/leaking counts. Only the `user`/auth tables keep better-auth's own ids. All id params in actions/API are `string`. **Foreign keys are enforced** (Postgres always is; the old SQLite setup ran with `PRAGMA foreign_keys=OFF`) — declared `onDelete` cascades really fire, and the delete guards that used to be the only protection against dangling references are now belt *and* braces.
- **All weights are gram integers** (`emptyWeightGrams`, `fullFilamentWeightGrams`, `measuredTotalWeightGrams`); display via `formatWeight()` (g below 1 kg, kg above); timestamps are `integer` unix-epoch columns surfaced as `Date` objects (Drizzle `mode: "timestamp"`)
- Remaining filament: `filamentLeftGrams = measuredTotalWeightGrams − spoolType.emptyWeightGrams` (clamped ≥ 0)
- Re-weigh (`setMeasuredWeight`) is allowed for the **owner and the current borrower** (active lend) — the borrower re-weighs from the Borrows tab ("Borrowed by you" section)
- **Empty** when `filamentLeftGrams ≤ 5`; **Low** when `percentLeft ≤ 15%`
- **Materials & spool types** are both global catalogs with `status` `approved | pending | rejected` and identical request→review workflows (`requestMaterial`/`requestSpoolType`): a pending entry is **immediately usable by its submitter**, visible to others only after approval; rejection never breaks existing references. Usable-rules: `assertMaterialUsable`/`assertSpoolTypeUsable` + `getUsableMaterials`/`getUsableSpoolTypes`. **Auto-approve** applies to admins AND **trusted contributors** (a `user.trustedContributor` flag toggled by admins on `/admin/users`, declared as a better-auth `additionalFields` in `lib/auth.ts` so it rides the session user; the auto-approve check lives once in `lib/catalog.ts` `request()`).
- **Material properties** (`properties` = admin-curated definitions with an immutable machine `key` + name/unit/description; `materialProperties` = value rows, unique per material×property): datasheet data (density, diameters, temps — migrated out of the old `materials` extra columns — plus tensile strength, hardness, etc.). **Definitions are admin-only** (managed on `/admin/properties`, `components/admin/property-admin-list.tsx`, no review flow). **Values are wiki-style**: any logged-in user sets/edits a value via `setMaterialProperty` (effective immediately), which records `submittedById` and sets `verified` = the editor is admin; non-admin edits show an "unverified" badge until an admin `verifyMaterialProperty`s them; delete is admin-only. Actions in `app/actions/properties.ts`; read helper `getPropertiesForMaterials` (`lib/material-properties.ts`) feeds both the dashboard material dialog and the catalog rows (`components/materials/material-properties-section.tsx`) and the REST API. The delete-a-material path clears value rows via the catalog factory's `onRemove` hook (FK cascade is inert at runtime — see below).
- **The material catalog is searched in SQL, not in the browser.** A SpoolmanDB import pushes it to
  tens of thousands of rows (460 manufacturers upstream, ~24k materials if you took them all), so
  nothing ships the whole catalog to the client: the spool-form picker queries `searchMaterials`
  as you type (debounced, 50 rows), `/materials` + `/admin/materials` read their filters from the
  URL and render one 150-row page, and `GET /api/v1/materials` is paginated (`q`/`limit`/`offset`).
  All of them build their `WHERE` with `materialWhere()` (`lib/material-search.ts`). Search is
  **token-wise**: every whitespace-separated token must appear in manufacturer + name + filament
  type, so "polymaker petg red" matches across three columns (matching `matchesTokens` in
  `lib/search.ts`, which still filters the dashboard's already-loaded inventory client-side).
  Paged queries order by `(manufacturer, name, id)` — the id breaks ties, without which
  LIMIT/OFFSET can skip or repeat a row.
- **Property range filters run in SQL too**, against `material_properties.value_min`/`value_max`.
  Values are free text ("1.24", "210–230", "1.75, 2.85"); `parseBounds()` (`lib/property-filter.ts`)
  defines the numeric span and **every writer must persist it** via `valueBoundColumns()` — a row
  written without the bounds silently stops matching range filters.
- **Catalog UI is one generalized component** per catalog (`components/catalog/material-catalog.tsx` / `spool-type-catalog.tsx`): a searchable, manufacturer-grouped, capped (150 rows) list. `/materials` + `/spool-types` render it read-only (own pending/rejected editable); `/admin/materials` + `/admin/spool-types` render the **same** component with `isAdmin` — adds a status filter + "Review pending" shortcut and inline Approve/Reject/Delete + edit-any on each row (`material-catalog-row.tsx` / `spool-type-catalog-row.tsx`). All admin actions are server-enforced (`requireAdmin`), so the inline controls are pure UX. Admin pages fetch `getAllMaterialsForAdmin`/`getAllSpoolTypesForAdmin` (all rows + `spoolCount` for the delete guard).
- **Spools** (DB table still named `filaments`, TS export `spools` — deliberate, renaming it would churn migrations and the REST API for no gain): a physical spool references `materialId` + `spoolTypeId` + weights. The dashboard groups spools by material (`groupInventory`); adding another spool of the same material is one click on the material card.
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

## Seeding catalogs from SpoolmanDB

`npm run db:import -- --manufacturer <slug> [--manufacturer …] [--type PETG,PLA] [--dry-run]`
seeds the global **materials** & **spool-type** catalogs from the community
[SpoolmanDB-Community](https://github.com/Icezaza2543/SpoolmanDB-Community) source
files (`scripts/import-spoolmandb.ts`). It consumes the clean *source* files (one
per manufacturer), NOT the compiled 50k-row output, and dedupes hard:

- **Product-line near-dupes** ("PET-G Premium" / "PETG Premium" / "PET G Matt
  Matte PETG") collapse by normalizing the name (fold `pet-g→petg`, drop
  material-code tokens, `matte→matt`, dedupe tokens); equal token lists merge
  (shortest name wins). Not subset — "Premium" ≠ "Premium High Speed".
- **Colors** dedupe by normalized name within a line (not exact hex — the same
  named color drifts a few hex points between lines; first swatch kept).
- One material per (line, color); the empty-spool weights become spool types.
- **Datasheet data** (density, diameters, extruder/bed temps) is seeded into the
  generic `material_properties` table as **verified** values (`submittedById` NULL),
  formatted the way the UI displays them (en-dash ranges, comma-space diameter lists).
  The four property definitions (`density`/`diameter`/`extruder_temp`/`bed_temp`) must
  already exist (migration `0001`); the importer aborts if they're missing. Seeding is
  **insert-only per material×property pair** — re-crawls never clobber a user/admin edit.

**Insert-only / idempotent** via a unique `externalKey` on both tables
(`spoolmandb:<mfr>:<line>:<color>` and `…:spool:<type>:<weight>`): a re-run skips
known keys, **claims** a matching manual row (sets only `externalKey` +
NULL-backfills the extra columns; never renames/recolors), or inserts a new
`approved` row. So admin edits and re-crawls never clobber each other. Upstream
*renames* change the key → old row lingers; delete it via `/admin/materials`.
Runs against whatever database `DATABASE_URL` names, and starts the local PGlite
host itself if nothing is serving it yet — so it works with or without a running
dev server.

**Admins can also import from the UI**: `/admin/import`
(`components/admin/import-manufacturers.tsx`) lists every upstream manufacturer with
what is already in the catalog, and imports a multi-selection **one manufacturer per
server action, sequentially** — short units of work, so progress is visible and the
queue resumable with no background-job machinery; a failure stops the run and names
the slug. Runs are recorded in `catalog_imports` (slug, display name, counts, last
error/time), which is also what a future scheduled refresh would iterate. The upstream
list comes from the GitHub contents API, rate-limited to 60 requests/hour, so it is
cached per server process.

Because the catalog then holds thousands of materials, the add-spool dialog's
**searchable combobox** (`components/dashboard/spool-form/material-picker.tsx`)
queries the server as you type rather than filtering a prop — see the catalog-search
rule under "Domain rules".

## Known gaps / quirks (V0 export leftovers)

- No README, no seed data (fresh DB shows the empty state; spool-type catalog starts empty too)
- `npm run lint` references eslint, but eslint is not in `devDependencies`
- Unused V0 placeholder assets in `public/` (`placeholder*.{svg,jpg,png}`)

## Working notes

Session-local plans and current working steps live in `.claude/workind-notes.md` (git-ignored).
