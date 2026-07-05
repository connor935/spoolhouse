# Spoolhouse — Filament Warehouse

Inventory manager for 3D-printer filament spools, exported from a Vercel V0 prototype.

**Core concept:** instead of tracking filament usage per print, you periodically re-weigh the whole spool on a scale. Remaining filament is computed as `measuredTotalWeight − emptySpoolWeight`.

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
- Pages: `/login`, `/forgot-password`, `/reset-password`, `/account` (display name + change password), `/admin/users` (admin only).

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

Single route `/`:

```
app/page.tsx (server component, force-dynamic)
  └─ getFilaments() → toFilamentView() per row
  └─ <WarehouseDashboard>  (client)
       ├─ stat tiles, tabs: In stock / Empty / All
       ├─ <SpoolCard> per spool  — status badge, progress bar, inline re-weigh flow, edit/delete menu
       └─ <SpoolFormDialog>      — create/edit form with live "filament left" preview
```

Mutations go through server actions in `app/actions/filaments.ts` (`createFilament`, `updateFilament`, `setMeasuredWeight`, `deleteFilament`), each calling `revalidatePath("/")` to refresh the page data. No global state library — server is the source of truth, `useState` for UI-local state only.

### Key files

| File | Purpose |
|---|---|
| `lib/filament.ts` | Domain logic: weight math, thresholds, `FilamentView`, `toFilamentView`, `formatKg`, `FILAMENT_TYPES` |
| `lib/db/schema.ts` | Drizzle `filaments` table + `Filament`/`NewFilament` types (re-exports auth schema) |
| `lib/auth.ts` / `lib/auth-client.ts` | better-auth server instance / React client |
| `lib/auth-session.ts` | `requireUser()` / `requireAdmin()` — mandatory in protected pages & actions |
| `proxy.ts` | Optimistic login redirect (cookie presence only) |
| `lib/db/index.ts` | better-sqlite3 + drizzle client singleton, auto-runs migrations on startup |
| `drizzle.config.ts` / `drizzle/` | drizzle-kit config and committed SQL migrations |
| `app/actions/filaments.ts` | All server actions (CRUD + re-weigh) |
| `components/warehouse-dashboard.tsx` | Main client UI: stats, filters, dialog state |
| `components/spool-card.tsx` | Spool display + inline re-weigh |
| `components/spool-form-dialog.tsx` | Create/edit form |
| `lib/utils.ts` | `cn()` (clsx + tailwind-merge) |

## Domain rules

- Remaining filament: `filamentLeft = measuredTotalWeight − emptySpoolWeight` (clamped ≥ 0)
- **Empty** when `filamentLeft ≤ 0.005` kg (5 g); **Low** when `percentLeft ≤ 15%`
- Weights are stored in **kg** as SQLite `real` columns — plain JS numbers throughout; timestamps are `integer` unix-epoch columns surfaced as `Date` objects (Drizzle `mode: "timestamp"`)
- Filament types: PLA, PETG, ABS, ASA, TPU, Nylon, PC, PVA, HIPS, Other (`FILAMENT_TYPES` in `lib/filament.ts`)

## Known gaps / quirks (V0 export leftovers)

- No README, no seed data (fresh DB shows the empty state)
- `npm run lint` references eslint, but eslint is not in `devDependencies`
- Pre-existing type error in `components/spool-form-dialog.tsx` (Base UI Select nullability) — build ignores it via `ignoreBuildErrors`
- Unused V0 placeholder assets in `public/` (`placeholder*.{svg,jpg,png}`)

## Working notes

Session-local plans and current working steps live in `.claude/workind-notes.md` (git-ignored).
