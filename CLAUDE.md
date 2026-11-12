# Spoolhouse — Filament Warehouse

Inventory manager for 3D-printer filament spools, exported from a Vercel V0 prototype.

**Core concept:** a global **material** ("Prusament — Galaxy Black, PLA") is referenced by many users' physical **spools**. Instead of tracking usage per print, you periodically re-weigh a spool on a scale: remaining filament = measured total weight − the empty-spool weight of its **spool type**. Materials AND spool types are global, admin-curated catalogs with a request→review workflow.

## Commands

```sh
npm run dev          # start dev server (+ the local database, see below)
npm run build        # production build
npm run start        # serve production build (+ the local database)
npm run db:serve     # local database only — for drizzle-kit studio / psql
npm test             # vitest: unit (lib/**/*.test.ts, node) + components (components/**/*.test.tsx + hooks/**/*.test.ts, jsdom)
npm run test:watch   # vitest in watch mode
npm run test:coverage  # vitest + v8 coverage → coverage/ (html + summary); server actions/DB code are covered by e2e instead
npm run test:e2e     # Playwright (e2e/, incl. axe WCAG 2.2 AA scan of every page in light/dark, desktop + 390px): builds, seeds a throwaway PGlite (data/pglite-e2e, port 5434), serves on :3100; E2E_SKIP_BUILD=1 reuses the last build. Needs `npx playwright install chromium` once
npm run test:e2e:ui  # same, in Playwright's UI mode
npm run storybook    # Storybook on :6006 (component workbench, light/dark toggle, a11y panel)
npm run build-storybook  # static Storybook build (CI runs it)
npm run db:generate  # drizzle-kit: generate migration from schema changes
npm run db:migrate   # drizzle-kit: apply migrations manually (usually unnecessary, see below)
npm run db:studio    # drizzle-kit: local DB browser (needs the DB up: dev or db:serve)
npm run admin:create -- <email> <name>   # bootstrap/promote an admin account
npm run db:seed      # demo data around the admin: test users, catalog, properties, a year of spools + weighings, groups, lends, notifications (-- --reset | --clean)
npm run format       # Prettier over the repo (.prettierrc, .prettierignore)
npm run format:check # what CI runs
```

Package manager is **npm** (`package-lock.json`).

## Git hooks (mandatory)

**Setup step for everyone, humans and Claude sessions alike: `npm install`** — its `prepare`
script runs husky, which points `core.hooksPath` at `.husky/_`. Check with
`git config core.hooksPath` (must print `.husky/_`); if it doesn't, run `npm run prepare`.
Do this in every fresh clone **and every git worktree's** first install.

- **pre-commit**: oxlint --fix + Prettier on the staged files (lint-staged, fixes re-staged),
  then `npm test`. **pre-push**: Playwright (`npm run test:e2e`, ~1–2 min) when the pushed
  commits touch app code; docs-only pushes skip it.
- **Never bypass them** (`--no-verify`, `HUSKY=0`, unsetting `core.hooksPath`). A failing hook
  means: fix the cause, then commit/push again. CI repeats the checks as a backstop; only CI
  sets `HUSKY=0` (Docker builds have no `.git`, so husky skips itself).
- Full details — hook table, troubleshooting (`~/.config/husky/init.sh` for fnm/nvm PATH),
  scripts, PR checklist — live in **[`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)**; keep it
  in sync when hooks or scripts change.

## Storybook & component tests

The UI was rebuilt from the mockups in `.claude/design/` (sidebar shell, Storybook-first); plan,
decisions and implementation log in `.claude/redesign-plan.md`. Visual changes start from the
mockup boards (`canvas.json`) and `.claude/design/spoolhouse.css`.

- Storybook 10 (`@storybook/nextjs-vite`), config only in `.storybook/` — components never live
  there. Stories sit next to their component (see "Component folders"); theme toggle = `.dark` on `<html>` like next-themes; fonts
  come from `lib/fonts.ts` (shared with `app/layout.tsx`).
- **Every component gets stories + a unit test.** Tests reuse the stories as fixtures:
  `composeStories` from **`@storybook/react`** (not `@storybook/nextjs-vite`, whose runtime needs
  its Vite plugin), Testing Library + `@testing-library/jest-dom`, spies via `fn` from
  `storybook/test` (`vi.fn()` has an incompatible Mock type for story args). Setup:
  `.storybook/vitest.setup.ts` applies the same preview annotations as Storybook.
- The Vitest `components` project deliberately does **not** use the Storybook Next.js Vite
  plugin (its global `module-alias` hook breaks under Node's ESM loader); only `next/font/google`
  is stubbed (`.storybook/mocks/next-font-google.ts`). Keep components presentational (data +
  callbacks as props, no `app/actions/*` / `lib/db` imports) so they need no Next runtime mocks.
- **Page shortcuts** (N add spool, R request, / search, review R/E/J/A) go through
  `useHotkeys` (`hooks/use-hotkeys.ts`, rules in `lib/hotkeys.ts`: never while typing, inside a
  dialog/menu or with Ctrl/Meta/Alt); show the key as `<Kbd aria-hidden>` and set `aria-keyshortcuts`.

## Auth

**better-auth** (email + password, Drizzle/Postgres adapter, admin plugin). Key points:

- **Registration is closed by default**, toggleable via `ALLOW_SIGNUP=true` (gates the better-auth API via `disableSignUp`, the `/signup` page, and the sign-up link on `/login` — see `signupAllowed` in `lib/auth.ts`; env changes need a server restart). Regardless of the flag, admins create accounts on `/admin/users`, and the first admin is bootstrapped with `npm run admin:create -- <email> <name>` (`scripts/create-admin.ts`; also promotes an existing user to admin).
- **Session checks:** `proxy.ts` does only an optimistic cookie-presence redirect to `/login`. The authoritative check is `requireUser()` / `requireAdmin()` from `lib/auth-session.ts` — **call one of these at the top of every protected page and every server action.** Ownership is enforced in SQL (`where userId = user.id`), never by trusting client-provided ids.
- Auth tables live in `lib/db/auth-schema.ts` (generated via `npx @better-auth/cli generate`, re-exported from `lib/db/schema.ts`). `filaments.userId` FKs to `user.id` with cascade delete.
- Client-side calls go through `authClient` (`lib/auth-client.ts`): sign-in/out, `changePassword`, `requestPasswordReset`/`resetPassword`, `admin.createUser`.
- Password-reset mails: `lib/mail.ts` — SMTP when `SMTP_HOST` is set, otherwise logged to the server console (dev fallback).
- Required env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (see `.env.example`).
- Pages: `/login`, `/signup` (only when `ALLOW_SIGNUP=true`), `/forgot-password`, `/reset-password`, `/account`, `/stats` (usage, costs, forecasts), `/materials` + `/spool-types` (catalogs + request), `/admin/users` + `/admin/materials` + `/admin/spool-types` + `/admin/properties` + `/admin/import` (admin only).
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

**CI/CD** (`.github/workflows/deploy.yml`): a `check` job (typecheck, oxlint, `format:check`,
`npm test`, Storybook build, and on PRs a full `next build`; `npm ci` with `HUSKY=0`) repeats
the local git hooks (see "Git hooks") and gates everything; only pushes to `main` build and deploy. The `deploy` job
only starts the Deploy workflow in the private `server` repo (`gh workflow run`,
`DEPLOY_DISPATCH_TOKEN` in the `production` environment) and waits for it — SSH key, host,
user and paths live only there, never in this public repo. Images are
tagged `:latest` **and** `:sha-<commit>` — roll back by pinning an older sha in the server's
compose file. The runtime image has a Docker `HEALTHCHECK` against `GET /api/health`
(public, `select 1`, 503 when the DB is unreachable), and the deploy runs
`docker compose up --wait`, so an unhealthy container fails the deploy job.

**Migrations must succeed on existing production data**: they run in one transaction and a
failure aborts the deploy. Before adding a unique constraint, clean up rows that would
violate it in the same migration (see `drizzle/0007_constraints_and_fk_indexes.sql`).

## Tech stack

- **Next.js 16.4.5** (App Router) with **React 19**, server components + server actions
- **TypeScript** (strict, path alias `@/*` → repo root) — `next build` type-checks, and CI (`check` job) runs `tsc --noEmit` + `oxlint` + `format:check` + `npm test` before anything is built or deployed; locally the husky hooks run oxlint, Prettier and the tests on every commit
- **Tailwind CSS v4** — CSS-first config in `app/globals.css` (`@theme inline`, oklch tokens); there is no `tailwind.config.*`
- **shadcn/ui** (style `base-nova`) built on **Base UI** (`@base-ui/react`), not Radix — primitives live in `components/ui/`
- **Drizzle ORM + node-postgres** for data access (PostgreSQL; PGlite locally, migrations via drizzle-kit)
- **better-auth** for authentication (see Auth section)
- `lucide-react` icons, `sonner` toasts
- **Theming:** `next-themes` (`components/layout/theme-provider/`, wrapped in `app/layout.tsx`, default = system, class strategy). Light/dark/system switch (`layout/theme-switch`) lives in the sidebar user menu. All colors come from the oklch tokens in `app/globals.css` (`:root` + `.dark`) — palette **"Prusa Orange & Graphite"** (spec: `design/PALETTE-PRUSA.md`, guarded by `lib/theme-tokens.test.ts`); never hardcode colors in components. Orange is light (~2.9:1 on white), so: **text** in the accent color uses `text-accent-ink`, never `text-accent`; **orange surfaces** (`bg-accent`) carry dark `text-accent-foreground`; **fill levels/charts** use `bg-data` (peak bar may be `bg-accent`, month-to-date `hatch-data`); **low/critical** is `destructive` (carmine), never orange; **buttons** default to graphite `bg-primary` — `variant="accent"` is reserved for the one main action ("Add spool"). Material swatches stay real material colors. App icons: `node scripts/gen-app-icons.mjs` (orange tile, graphite mark)

## Architecture

Every signed-in page renders inside the **sidebar app shell**:

```
app/(app)/layout.tsx           requireUser() + getNavCounts() + sidebar cookie
  └─ <AppShellContainer>       components/layout/app-shell — owns the one <main>
       ├─ <AppSidebar>          ≥ md: 240px / 56px rail (collapse state in the `sidebar_collapsed` cookie)
       │    nav model lib/nav.ts, badge counts lib/nav-counts.ts, <UserMenu> (account, theme, sign out)
       ├─ <MobileTopBar> + <NavDrawer> + <BottomNav>   < md (Home · Stock · Borrows · Groups · Stats)
       └─ page → <PageHeader> (common/page-header: kicker/breadcrumb, title, actions) + content
app/(auth)/layout.tsx          login, signup, forgot/reset password (auth-card)
app/groups/join/[code]         standalone invite page
```

| Route                                  | Page (server component → client view)                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                                    | **Overview** (`overview/overview-page`, roll-ups in `lib/overview.ts`): key figures, running low, monthly usage, activity, borrows, drying |
| `/inventory`                           | **Inventory** (`inventory/inventory-page`): status seg In stock/Empty/All + filter panel, material blocks with spool tiles                 |
| `/materials/[id]`                      | **Material detail** (`materials/material-detail`): readouts, your spools, 12-month usage, properties (wiki edit), "In your groups"         |
| `/borrows`                             | All lends across groups (`borrows/borrows-view`, fed by `getMyLends()`)                                                                    |
| `/groups`, `/groups/[id]`              | Group cards + create/join; group **Stock** view and **Settings** (`?view=settings`)                                                        |
| `/stats`, `/notifications`, `/account` | Usage/costs/forecasts; actionable notification list; display name, password, API tokens                                                    |
| `/materials`, `/spool-types`           | Catalogs (filter panel, manufacturer groups, side-panel request form)                                                                      |
| `/admin/*`                             | users, materials + spool-types (table + `…/review` one-at-a-time **review queue**), properties, import                                     |

**Old links**: the pre-redesign tabbed dashboard used `/?tab=…&q=…`; `legacyDashboardRedirect()`
(`lib/inventory-params.ts`, called by `app/(app)/page.tsx`) sends them to `/inventory?…`,
`/borrows` or `/groups/[id]`.

**Inventory URL state**: `/inventory` filters (`?status,&q,&type,&minLeft,&props`) are parsed
server-side by `parseInventoryParams()` and written back with `history.replaceState`, so filtered
views are shareable links. The client filter itself is `lib/inventory-filter.ts`.

**Spool flows**: add/edit is `inventory/spool-editor` — a dialog on desktop, a bottom sheet on
mobile (`useIsMobile`) — with material + spool-type pickers (inline request flows), details and
weighing history + undo. Clicking a spool tile opens the re-weigh **popover** (desktop) or
**sheet** (mobile), both around `inventory/reweigh-form`.

Mutations go through server actions in `app/actions/filaments.ts` (`createSpool`, `updateSpool`,
`setMeasuredWeight`, `deleteSpool`), each calling `revalidatePath("/")`. No global state library —
the server is the source of truth, `useState` for UI-local state only. **Live refresh**:
`layout/live-refresh` subscribes to `/api/events` (SSE, per-user listeners in `lib/events.ts`) and
calls `router.refresh()` when this user's data changed elsewhere (e.g. the NFC scale via the REST
API), debounced; it also refreshes after a reconnect and when a mobile tab becomes visible again.

**Groups, sharing & lending**: invite-only groups pool members' (selectively) shared spools.
**`/borrows`** shows all lends across groups: incoming requests (approve/decline), own requests
(cancel), lent out (mark returned), borrowed (re-weigh), history. **Pooled stock lives on
`/groups/[id]`** (Stock view: grouped by material, request/cancel/return); the Settings view
(`?view=settings`) has share mode with preview, rename, invite rotate, members, delete/leave —
refused while a concerned lend is active. Pending requests are visible on stock rows ("Requested —
awaiting approval" for the requester, who can cancel; "Requested by X" for the owner).

**In-app notifications**: lend lifecycle events write rows to the `notifications` table
(`lib/notifications.ts` helper, called from `app/actions/lends.ts`; names are denormalized snapshots).
The unread count is the badge on the sidebar/drawer **Notifications** entry (`getNavCounts`);
`/notifications` lists them and marks all read on open (which also prunes read notifications older
than 90 days). **Borrow-request notifications are actionable**: `getNotifications` joins the lend's
current status, and clicking such a row opens the approve/decline `BorrowRequestDialog`.

**Page layout rule**: the shell owns the one `<main>` — **never hand-roll a `<main>` (or a page-width
wrapper) inside it.** A page starts with `<PageHeader>`; sub-pages put their trail in its
`breadcrumb` prop rather than a back link. Containers (`*-container.tsx`) next to a view call the
server actions and pass data + callbacks into the presentational view.

### Component folders

`components/` is grouped by feature, one level deep. All folder and file names are kebab-case. **Put a new component in the folder of the surface that owns it; only
promote to `common/` once a second feature imports it.**

**One folder per component** — every component, no flat files:

```
components/ui/button/
  button.tsx          # the component
  button.stories.tsx  # Storybook stories (also the test fixtures)
  button.test.tsx     # unit tests via composeStories
  index.ts            # export * from './button';  — keeps imports `@/components/ui/button`
```

Import other components through their folder (`@/components/ui/button` or `../button`), never a
file inside another component's folder. The shadcn CLI writes flat files, so add primitives with
**`scripts/ui-add.sh <name>…`** (runs `shadcn add`, then moves each new file into its folder and
writes the barrel; it reports flat duplicates of existing components instead of overwriting).
A `*-container.tsx` (server-action glue) shares its view's folder and is exported from the same
barrel; containers are tested with `vi.mock` on the action module and get no stories.

| Folder           | Contents                                                                                                                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/`            | shadcn/Base-UI primitives — never hand-edit for feature needs                                                                                                                                                                                                                       |
| `common/`        | Used by 2+ features: `page-header`, `section-header`, `readout-strip`, `empty-state`, `alert`, `confirm-dialog`, `search-input`, `select-field`, `filter-panel`/`filter-sheet`/`filter-fields`, `active-filter-chips`, `status-badge`, avatars, `password-field`, request-form bits |
| `layout/`        | App chrome: `app-shell`, `app-sidebar`, `nav-list`, `nav-drawer`, `mobile-top-bar`, `bottom-nav`, `user-menu`, `theme-switch`, `brand-logo`, `theme-provider`, `live-refresh`, `not-found-view`                                                                                     |
| `overview/`      | `/`: `overview-page`, `overview-view`, `activity-list`/`activity-item`                                                                                                                                                                                                              |
| `inventory/`     | `/inventory` + spool flows: `inventory-page`/`-view`, `material-block`, `spool-tile`, `swatch`, `meter`, `weight-display`, `reweigh-*`, `spool-editor` (+ pickers), `spool-*-fields`, `weighing-history-list`; fixtures in `stories/fixtures/inventory.ts`                          |
| `materials/`     | `/materials/[id]`: `material-detail` (+ container), `property-list` (wiki-style property values), `material-group-stock-table`                                                                                                                                                      |
| `catalog/`       | `/materials` + `/spool-types` + admin twins: `catalog-page`, `catalog-toolbar`, `catalog-row`, `manufacturer-header`, `*-catalog-view`, `admin-catalog-*`, `review-queue`/`review-summary`/`duplicate-candidate-row`, `*-entry-form`, `edit-*-dialog`                               |
| `groups/`        | `/groups` + `/groups/[id]` + `/groups/join/[code]`: `groups-view`, `group-card`, `group-detail`, `group-stock-view`/`-row`, `group-settings-view`, `share-mode-picker`, `member-row`, `invite-code-box`, `join-group-card`                                                          |
| `borrows/`       | `/borrows` + lend atoms: `borrows-view` (+ container), `lend-request-card`, `lend-line`, `lend-history-table`, `lend-spool-label`, `borrow-request-dialog`                                                                                                                          |
| `notifications/` | `/notifications`: `notifications-view` (+ container), `notification-row`                                                                                                                                                                                                            |
| `stats/`         | `/stats`: `stats-view`, `usage-bar-chart`, `runway-table`, `stock-composition-bar`                                                                                                                                                                                                  |
| `auth/`          | `auth-card` shell + `login-form`, `signup-form`, `forgot-password-form`, `reset-password-form` (each form + container)                                                                                                                                                              |
| `account/`       | `/account`: `account-view` (+ container): display name, password, API tokens                                                                                                                                                                                                        |
| `admin/`         | Admin-only surfaces with no catalog equivalent: `users-view`, `properties-view` + `property-dialog`, `import-view` + `import-manufacturer-row` + `import-progress`                                                                                                                  |
| `api-docs/`      | `swagger-docs` (the `/api-docs` Swagger UI client wrapper)                                                                                                                                                                                                                          |

### Key files

| File                                                                             | Purpose                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/filament.ts`                                                                | Domain logic: gram math, thresholds, `SpoolView`, `MaterialInventory`, `toSpoolView`, `groupInventory`, `formatWeight`, `materialLabel`, `spoolTypeLabel`, `FILAMENT_TYPES`; money (`formatMoney`, `parsePriceCents`, `pricePerGramCents`), drying hint (`needsDrying`, `DRYING_INTERVAL_DAYS`), `lendUsageGrams` |
| `lib/weighings.ts` / `lib/consumption.ts` / `lib/usage-stats.ts`                 | Weighing history writer + undo / pure usage math (drops, monthly, rate, forecast) / DB-backed stats for `/stats`, `/` and material detail                                                                                                                                                                         |
| `app/actions/spool-types.ts` / `app/actions/materials.ts`                        | Catalog actions (usable/catalog queries, request, admin approve/reject) — same pattern for both                                                                                                                                                                                                                   |
| `lib/db/schema.ts`                                                               | Drizzle tables (`materials`, `spools` [DB: "filaments"], `spoolTypes`, `spoolWeighings` [weighing history], `properties` + `materialProperties` [datasheet values], `groups`, `groupMembers`, `filamentShareOverrides` [material-level], `lends`, `notifications`) + inferred types (re-exports auth schema)      |
| `components/layout/app-shell/` / `lib/nav.ts` / `lib/nav-counts.ts`              | Sidebar shell (owns `<main>`) / nav model / badge counts (inventory, borrow requests, unread, groups, review queues)                                                                                                                                                                                              |
| `lib/notifications.ts` / `app/actions/notifications.ts`                          | Notification writer helper / read actions (`getUnreadCount`, `getNotifications`, `markAllRead`)                                                                                                                                                                                                                   |
| `lib/auth.ts` / `lib/auth-client.ts`                                             | better-auth server instance / React client                                                                                                                                                                                                                                                                        |
| `lib/auth-session.ts`                                                            | `requireUser()` / `requireAdmin()` — mandatory in protected pages & actions                                                                                                                                                                                                                                       |
| `proxy.ts`                                                                       | Optimistic login redirect (cookie presence only)                                                                                                                                                                                                                                                                  |
| `lib/db/index.ts`                                                                | node-postgres pool + drizzle client singleton; `runMigrations()` / `closeDb()`                                                                                                                                                                                                                                    |
| `lib/db/local.mjs` / `scripts/pglite-server.mjs`                                 | Local-dev DB connection details / the PGlite host process                                                                                                                                                                                                                                                         |
| `scripts/with-local-db.mjs` / `scripts/local-db.mjs`                             | Wrapper that boots the local DB for `dev`/`start` / `withLocalDb()` for the CLI scripts                                                                                                                                                                                                                           |
| `instrumentation.ts`                                                             | Applies pending migrations once, before the server serves requests                                                                                                                                                                                                                                                |
| `drizzle.config.ts` / `drizzle/`                                                 | drizzle-kit config and committed SQL migrations                                                                                                                                                                                                                                                                   |
| `app/actions/filaments.ts`                                                       | Spool server actions: `getInventory`, `createSpool`/`updateSpool` (usable-material/type checks), `setMeasuredWeight` (owner or active borrower), `deleteSpool`                                                                                                                                                    |
| `lib/sharing.ts`                                                                 | `getSharedFilaments(groupId)` — single source of truth resolving each member's share mode into the group's pooled stock; `getMembership(groupId, userId)`                                                                                                                                                         |
| `app/actions/groups.ts`                                                          | Group CRUD, membership, invite codes, `updateShareSettings`                                                                                                                                                                                                                                                       |
| `app/actions/lends.ts`                                                           | Lend lifecycle: `requestLend`, `approveLend`, `declineLend`, `markReturned`, `cancelLendRequest`, `getMyLends` (cross-group, feeds `/borrows`), `getActiveLendsForOwner` — mutations write notifications                                                                                                          |
| `components/borrows/borrows-view/` / `notifications/notifications-view/`         | `/borrows` page / actionable notification list with approve-decline dialog                                                                                                                                                                                                                                        |
| `components/overview/` / `lib/overview.ts`                                       | `/` Overview page / its pure roll-ups (running low, 30-day delta, stock value)                                                                                                                                                                                                                                    |
| `components/inventory/inventory-page/` / `lib/inventory-params.ts`               | `/inventory` page / URL state parse + serialize + `legacyDashboardRedirect()`                                                                                                                                                                                                                                     |
| `components/inventory/spool-editor/`                                             | Add/edit spool (dialog / mobile sheet): material + spool-type pickers with inline request flows, details (price, location, drying), weighing history + undo                                                                                                                                                       |
| `components/groups/group-detail/` / `group-stock-view/` / `group-settings-view/` | `/groups/[id]` frame, Stock view and Settings view                                                                                                                                                                                                                                                                |
| `lib/api-auth.ts`                                                                | REST-API token auth: `generateApiToken`, `authenticateApiRequest(request)`, `apiError`/`unauthorized` helpers                                                                                                                                                                                                     |
| `lib/spool-type-usable.ts`                                                       | `isSpoolTypeUsable`/`assertSpoolTypeUsable` — shared by server actions and REST API                                                                                                                                                                                                                               |
| `app/actions/api-tokens.ts`                                                      | API-token management actions (create/list/revoke) backing the `/account` section                                                                                                                                                                                                                                  |
| `app/api/v1/`                                                                    | REST route handlers (see "REST API" below); `spools/shared.ts` holds serialization + body validation                                                                                                                                                                                                              |
| `lib/material-search.ts`                                                         | SQL `WHERE` builder for the catalog: token search, manufacturer/type, property ranges                                                                                                                                                                                                                             |
| `lib/property-value.ts`                                                          | Property value types + `normalizePropertyValue()` — the one place input is validated/canonicalised                                                                                                                                                                                                                |
| `lib/search.ts`                                                                  | Token matching for client-side searches (`searchTokens`/`matchesTokens`/`matchRank`)                                                                                                                                                                                                                              |
| `lib/spoolmandb.ts`                                                              | SpoolmanDB import core (fetch, dedupe, upsert) — used by the CLI **and** `/admin/import`                                                                                                                                                                                                                          |
| `app/actions/spoolmandb.ts`                                                      | Admin import actions (`getUpstreamManufacturers`, `importManufacturerFromUpstream`)                                                                                                                                                                                                                               |
| `lib/utils.ts`                                                                   | `cn()` (clsx + tailwind-merge)                                                                                                                                                                                                                                                                                    |

## Domain rules

- **All app-table primary keys are random UUIDs** (`text`, `$defaultFn(() => randomUUID())` in `lib/db/schema.ts`), not sequential integers — they're exposed in the REST API (`/api/v1/spools/:id`) and URLs, so unguessable ids avoid enumeration/leaking counts. Only the `user`/auth tables keep better-auth's own ids. All id params in actions/API are `string`. **Foreign keys are enforced** (Postgres always is; the old SQLite setup ran with `PRAGMA foreign_keys=OFF`) — declared `onDelete` cascades really fire, and the delete guards that used to be the only protection against dangling references are now belt _and_ braces.
- **Every server action validates its input with Zod** (`lib/schemas.ts`, `parseOrThrow`) — server actions are public POST endpoints, client-side checks are UX only. Spool actions use `spoolInputSchema` / `measuredWeightSchema`, the REST routes `spoolBodySchema`.
- **Index every foreign-key column you filter or cascade on** — Postgres does not do it automatically (a composite unique/index whose _leading_ column is the FK counts). Unique violations a caller must handle are detected by constraint name via `isUniqueViolation()` (`lib/db/errors.ts`).
- **`tagUid` is unique per user** (`filaments_user_id_tag_uid_unique`; NULLs don't collide) so `POST /spools/weigh` always resolves a tag to one spool; the REST API answers duplicates with `409 tag_conflict`.
- **All weights are gram integers** (`emptyWeightGrams`, `fullFilamentWeightGrams`, `measuredTotalWeightGrams`); display via `formatWeight()` (g below 1 kg, kg above); timestamps are `timestamptz` columns surfaced as `Date` objects
- Remaining filament: `filamentLeftGrams = measuredTotalWeightGrams − spoolType.emptyWeightGrams` (clamped ≥ 0)
- Re-weigh (`setMeasuredWeight`) is allowed for the **owner and the current borrower** (active lend) — the borrower re-weighs on `/borrows` ("Borrowed by you" section). **While a spool is lent out only the borrower may re-weigh it**: the owner can't edit, re-weigh, undo, mark dried or delete it until it is marked returned (`lib/lend-lock.ts`: `notLentOut()` in the write's `WHERE`, `isLentOut()`; REST answers `409 lent_out`). Tiles/rows of a lent spool render read-only.
- **Empty** when `filamentLeftGrams ≤ 5`; **Low** when `percentLeft ≤ 15%`
- **Materials & spool types** are both global catalogs with `status` `approved | pending | rejected` and identical request→review workflows (`requestMaterial`/`requestSpoolType`): a pending entry is **immediately usable by its submitter**, visible to others only after approval; rejection never breaks existing references. Usable-rules: `assertMaterialUsable`/`assertSpoolTypeUsable` on writes; reads use `searchMaterials` (SQL, `visibleTo` the user) / `getUsableSpoolTypes`. **Auto-approve** applies to admins AND **trusted contributors** (a `user.trustedContributor` flag toggled by admins on `/admin/users`, declared as a better-auth `additionalFields` in `lib/auth.ts` so it rides the session user; the auto-approve check lives once in `lib/catalog.ts` `request()`).
- **Material properties** (`properties` = admin-curated definitions with an immutable machine `key` + name/unit/description; `materialProperties` = value rows, unique per material×property): datasheet data (density, diameters, temps — migrated out of the old `materials` extra columns — plus tensile strength, hardness, etc.). **Definitions are admin-only** (managed on `/admin/properties`, `components/admin/properties-view/`, no review flow). **Values are wiki-style**: any logged-in user sets/edits a value via `setMaterialProperty` (effective immediately), which records `submittedById` and sets `verified` = the editor is admin; non-admin edits show an "unverified" badge until an admin `verifyMaterialProperty`s them; delete is admin-only. Actions in `app/actions/properties.ts`; read helper `getPropertiesForMaterials` (`lib/material-properties.ts`) feeds the material detail page (`components/materials/property-list`), the inventory property filter and the REST API. The delete-a-material path clears value rows via the catalog factory's `onRemove` hook (the FK cascade would also fire; the hook keeps the intent explicit).
- **The material catalog is searched in SQL, not in the browser.** A SpoolmanDB import pushes it to
  tens of thousands of rows (460 manufacturers upstream, ~24k materials if you took them all), so
  nothing ships the whole catalog to the client: the spool-editor picker queries `searchMaterials`
  as you type (debounced, 50 rows), `/materials` + `/admin/materials` read their filters from the
  URL and render one 150-row page, and `GET /api/v1/materials` is paginated (`q`/`limit`/`offset`).
  All of them build their `WHERE` with `materialWhere()` (`lib/material-search.ts`). Search is
  **token-wise**: every whitespace-separated token must appear in manufacturer + name + filament
  type, so "polymaker petg red" matches across three columns (matching `matchesTokens` in
  `lib/search.ts`, which still filters the already-loaded `/inventory` client-side).
  The token concatenation is backed by a `pg_trgm` GIN index (`materials_search_trgm_idx`,
  `drizzle/0008`) on the exact same expression — change one, change both. PGlite loads the
  extension in `scripts/pglite-server.mjs`.
  Paged queries order by `(manufacturer, name, id)` — the id breaks ties, without which
  LIMIT/OFFSET can skip or repeat a row.
- **Every property definition declares a value type** (`properties.valueType`: `number | integer |
range | list | text`, see `lib/property-value.ts`), and `normalizePropertyValue()` validates +
  canonicalises against it on **every** write — `setMaterialProperty` and the SpoolmanDB importer
  both. This exists because values are free text and a decimal comma used to be read as a range:
  "1,24" parsed as 1–24 and matched a "density 20–30" filter. Now it is stored as "1.24"; input
  that cannot be resolved is rejected with a message rather than guessed at (notably `list`, where
  a comma is already the separator, so "1,75, 2,85" is ambiguous and refused). Types are set on
  `/admin/properties`; **changing one re-validates every existing value and is refused if any no
  longer fit**, then re-normalises the rest so stored values and bounds match. `text` never gets
  bounds and is never range-filtered. Case table: `lib/property-value.test.ts` (`npm test`).
- **Property range filters run in SQL**, against `material_properties.value_min`/`value_max`, which
  come from that same normalisation. A row written without bounds silently stops matching range
  filters, so nothing may write `value` without them. `parseBounds()` (`lib/property-filter.ts`)
  still backs the `/inventory` client-side filter over already-loaded inventory, but it reads every
  run of digits and must not be used on unvalidated input.
- **Catalog UI is one generalized component** per catalog (`components/catalog/material-catalog.tsx` / `spool-type-catalog.tsx`): a searchable, manufacturer-grouped, capped (150 rows) list. `/materials` + `/spool-types` render it read-only (own pending/rejected editable); `/admin/materials` + `/admin/spool-types` render the **same** component with `isAdmin` — adds a status filter + "Review pending" shortcut and inline Approve/Reject/Delete + edit-any on each row (`material-catalog-row.tsx` / `spool-type-catalog-row.tsx`). All admin actions are server-enforced (`requireAdmin`), so the inline controls are pure UX. Admin pages fetch `getAllMaterialsForAdmin`/`getAllSpoolTypesForAdmin` (all rows + `spoolCount` for the delete guard).
- **Spools** (DB table still named `filaments`, TS export `spools` — deliberate, renaming it would churn migrations and the REST API for no gain): a physical spool references `materialId` + `spoolTypeId` + weights. `/inventory` groups spools by material (`groupInventory`); adding another spool of the same material is one click on the material block.
- **Sharing is material-level**: a member's whitelist/blacklist overrides reference material ids (all their spools of it, incl. future ones). Lending stays per physical spool. Group stock is grouped by material across owners.
- **Weighing history** (`spool_weighings`): every write of `measuredTotalWeightGrams` — spool editor
  create/edit (edit only when the weight changed), borrower re-weigh, REST create/PATCH/PUT weight,
  tag weigh — must call `recordWeighing()` (`lib/weighings.ts`) right after, so the newest row always
  equals the spool's weight. **Usage = sum of drops between consecutive weighings**; increases are
  ignored (corrections/refills). A mistyped weight is fixed with **undo** (`undoLastWeighing`, edit
  dialog), which deletes the newest row and restores the previous weight rather than adding a
  correcting one — that keeps the usage stats clean. Migration `0010` backfilled one baseline row
  per spool. Forecasts (`dailyRate`) average over the last 60 days or the tracked time if shorter,
  never under 7 days.
- **Lend usage**: `approveLend`/`markReturned` snapshot the spool's weight into
  `lends.startWeightGrams`/`endWeightGrams`; `/borrows` shows the difference (and its cost).
- **Spool details**: optional `pricePaidCents` (euro cents; `CURRENCY` in `lib/filament.ts`),
  `purchasedAt` (date), `location` (free text, matched by the `/inventory` search per spool),
  `lastDriedAt`. Hygroscopic types get a "Dry?" badge (click = `markDried`) once
  `lastDriedAt ?? createdAt` is older than `DRYING_INTERVAL_DAYS`; the `drying_temp` property
  (seeded definition, migration `0010`) is shown in its tooltip.
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
  At most one `requested`/`active` lend per filament: `requestLend` checks first for a friendly
  message, the partial unique index `lends_one_open_per_filament` makes it hold under
  concurrency. Status transitions re-check the expected status in the `UPDATE`/`DELETE` `WHERE`,
  so a racing approve/decline/cancel can't overwrite each other. A pending request blocks nothing; an **active** lend locks the spool against the owner's writes (see "Domain rules").
- **Groups/memberships never leave lends dangling** (`settleOpenLends` in `app/actions/groups.ts`):
  deleting a group, removing a member or leaving is **refused while a concerned lend is active**
  (owner marks it returned first); pending requests are closed first — withdrawn when a member
  leaves on their own, otherwise declined with a notification to the borrower.
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
  `lastUsedAt` (at most every 5 min, so a polling scale doesn't write per request) — call it first in every `/api/v1` route handler (the API-route counterpart
  of `requireUser()`; ownership still enforced in SQL `WHERE`).
- Endpoints: `GET /me`, `GET /spool-types` (usable ones), `GET /materials` (paginated),
  `GET|POST /spools`, `GET|PATCH|DELETE /spools/:id`, `PUT /spools/:id/weight` (re-weigh),
  `GET /spools/:id/weighings` (history),
  `POST /spools/weigh` (register-or-refresh by NFC tag; registering needs manufacturer, name
  and `emptyWeightGrams` > 0). Mutations call
  `revalidatePath("/")`. Errors: `{"error":{"code","message"}}` with 400/401/404/409.
- `proxy.ts` exempts all of `/api/` from the login redirect; API auth happens in the
  handlers. Groups/lending are not exposed in v1.
- **Keep `lib/openapi.ts` and `docs/api.md` in sync when endpoints change.**

## Seeding catalogs from SpoolmanDB

`npm run db:import -- --manufacturer <slug> [--manufacturer …] [--type PETG,PLA] [--dry-run]`
seeds the global **materials** & **spool-type** catalogs from the community
[SpoolmanDB-Community](https://github.com/Icezaza2543/SpoolmanDB-Community) source
files (`scripts/import-spoolmandb.ts`). It consumes the clean _source_ files (one
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
_renames_ change the key → old row lingers; delete it via `/admin/materials`.
Runs against whatever database `DATABASE_URL` names, and starts the local PGlite
host itself if nothing is serving it yet — so it works with or without a running
dev server.

**Admins can also import from the UI**: `/admin/import`
(`components/admin/import-view/`) lists every upstream manufacturer with
what is already in the catalog, and imports a multi-selection **one manufacturer per
server action, sequentially** — short units of work, so progress is visible and the
queue resumable with no background-job machinery; a failure stops the run and names
the slug. Runs are recorded in `catalog_imports` (slug, display name, counts, last
error/time), which is also what a future scheduled refresh would iterate. The upstream
list comes from the GitHub contents API, rate-limited to 60 requests/hour, so it is
cached per server process.

Because the catalog then holds thousands of materials, the add-spool dialog's
**searchable combobox** (`components/inventory/spool-editor/material-picker.tsx`)
queries the server as you type rather than filtering a prop — see the catalog-search
rule under "Domain rules".

## Known gaps / quirks (V0 export leftovers)

- No README; a fresh DB shows the empty state until `npm run db:seed` (dev demo data, all removable with `-- --clean`)
- Server-action error messages are masked in production builds, so client toasts use static
  messages naming the likely cause rather than the thrown text

## Working notes

Session-local plans and current working steps live in `.claude/workind-notes.md` (git-ignored).
