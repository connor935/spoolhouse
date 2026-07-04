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
```

Package manager is **npm** (`package-lock.json`).

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
- `lucide-react` icons, `sonner` toasts, `next-themes` (installed but no ThemeProvider wired yet)

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
| `lib/db/schema.ts` | Drizzle `filaments` table + `Filament`/`NewFilament` types |
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
- `next-themes` installed but dark mode has no provider/toggle (dark CSS variables exist in `globals.css`)
- Unused V0 placeholder assets in `public/` (`placeholder*.{svg,jpg,png}`)

## Working notes

Session-local plans and current working steps live in `.claude/workind-notes.md` (git-ignored).
